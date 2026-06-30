"""
Graph Service — Road graph operations: build, route, centrality, disaster updates.
Uses NetworkX for in-memory graph and shapely for spatial ops.
"""

from __future__ import annotations

import json
import math
from typing import Any, Literal, Optional

import networkx as nx
import numpy as np
from loguru import logger
from shapely.geometry import LineString, Point, shape


# ─── Helpers ────────────────────────────────────────────────────────────────

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in metres between two lat/lon points."""
    R = 6_371_000
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _nearest_node(G: nx.Graph, lat: float, lon: float) -> Any:
    """Find the nearest graph node to a given (lat, lon) coordinate."""
    best, best_dist = None, float("inf")
    for node, data in G.nodes(data=True):
        d = _haversine(lat, lon, data["lat"], data["lon"])
        if d < best_dist:
            best, best_dist = node, d
    return best


def _coords_to_geojson_linestring(coords: list[tuple[float, float]]) -> dict:
    return {
        "type": "LineString",
        "coordinates": [[lon, lat] for lat, lon in coords],
    }


# ─── Graph Service ───────────────────────────────────────────────────────────

class GraphService:
    """
    In-memory road graph service for Coimbatore.
    Builds graph from GeoJSON road features, computes centrality, routes.
    """

    def __init__(self):
        self._graphs: dict[str, nx.Graph] = {}   # keyed by prediction_id or "default"
        self._active_key: str = "default"

    def _key(self, prediction_id: Optional[int]) -> str:
        return str(prediction_id) if prediction_id is not None else "default"

    def has_graph(self, prediction_id: Optional[int] = None) -> bool:
        return self._key(prediction_id) in self._graphs

    def build_from_geojson(
        self,
        geojson: dict,
        prediction_id: Optional[int] = None,
    ) -> dict:
        """
        Build a NetworkX graph from a GeoJSON FeatureCollection of LineStrings.
        Each LineString becomes a sequence of edges.
        Computes betweenness centrality and identifies articulation points.
        """
        key = self._key(prediction_id)
        G = nx.Graph()

        # Build graph from line features
        features = geojson.get("features", [])
        logger.info(f"Building graph from {len(features)} road features")

        node_counter = 0
        node_lookup: dict[tuple, int] = {}  # (lat_r, lon_r) → node_id

        def get_or_create_node(lat: float, lon: float) -> int:
            nonlocal node_counter
            # Round to ~1m precision to merge near-duplicate nodes
            key_pt = (round(lat, 5), round(lon, 5))
            if key_pt not in node_lookup:
                nid = node_counter
                node_lookup[key_pt] = nid
                G.add_node(nid, lat=lat, lon=lon)
                node_counter += 1
            return node_lookup[key_pt]

        for feat in features:
            geom = feat.get("geometry", {})
            if geom.get("type") != "LineString":
                continue
            coords = geom["coordinates"]  # [[lon, lat], ...]
            latlon = [(c[1], c[0]) for c in coords]  # → [(lat, lon)]

            for i in range(len(latlon) - 1):
                u_lat, u_lon = latlon[i]
                v_lat, v_lon = latlon[i + 1]
                u = get_or_create_node(u_lat, u_lon)
                v = get_or_create_node(v_lat, v_lon)
                dist = _haversine(u_lat, u_lon, v_lat, v_lon)
                G.add_edge(u, v, weight=dist, length_m=dist, blocked=False)

        logger.info(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

        # Centrality on largest connected component
        segments = []
        critical_nodes_data = []

        if G.number_of_nodes() > 0:
            largest_cc = max(nx.connected_components(G), key=len)
            G_cc = G.subgraph(largest_cc).copy()

            # Betweenness centrality (edge)
            if G_cc.number_of_edges() > 0:
                logger.info("Computing betweenness centrality...")
                edge_bc = nx.edge_betweenness_centrality(G_cc, weight="weight", normalized=True)
                node_bc = nx.betweenness_centrality(G_cc, weight="weight", normalized=True)
                closeness = nx.closeness_centrality(G_cc)
                articulation_pts = set(nx.articulation_points(G_cc))
            else:
                edge_bc = {}
                node_bc = {}
                closeness = {}
                articulation_pts = set()

            # Build segment list
            for u, v, data in G_cc.edges(data=True):
                u_data = G.nodes[u]
                v_data = G.nodes[v]
                bc = edge_bc.get((u, v), edge_bc.get((v, u), 0.0))
                segments.append({
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [u_data["lon"], u_data["lat"]],
                            [v_data["lon"], v_data["lat"]],
                        ],
                    },
                    "length_m": data.get("length_m", 0.0),
                    "weight": data.get("weight", 1.0),
                    "centrality": bc,
                    "is_critical": bc > np.percentile(list(edge_bc.values()), 80) if edge_bc else False,
                })

            # Build critical node list
            for nid in G_cc.nodes():
                ndata = G_cc.nodes[nid]
                critical_nodes_data.append({
                    "node_id": f"{ndata['lat']:.5f}_{ndata['lon']:.5f}",
                    "lat": ndata["lat"],
                    "lon": ndata["lon"],
                    "betweenness": node_bc.get(nid, 0.0),
                    "closeness": closeness.get(nid, 0.0),
                    "is_articulation_point": nid in articulation_pts,
                })

        self._graphs[key] = G
        self._active_key = key
        logger.success(f"Graph '{key}' built and stored.")

        return {
            "num_nodes": G.number_of_nodes(),
            "num_edges": G.number_of_edges(),
            "segments": segments,
            "critical_nodes": critical_nodes_data,
            "stats": {
                "num_connected_components": nx.number_connected_components(G),
                "avg_degree": (
                    sum(d for _, d in G.degree()) / G.number_of_nodes()
                    if G.number_of_nodes() > 0 else 0
                ),
            },
        }

    def find_route(
        self,
        start: tuple[float, float],
        end: tuple[float, float],
        algorithm: Literal["dijkstra", "astar", "yens"] = "astar",
        k: int = 3,
        prediction_id: Optional[int] = None,
    ) -> dict:
        """Find route between (lat, lon) start and end points."""
        key = self._key(prediction_id)
        if key not in self._graphs:
            # Try any available graph
            if not self._graphs:
                raise ValueError("No road graph available. Build one first.")
            key = self._active_key

        G = self._graphs[key]
        # Subgraph without blocked edges
        G_active = nx.Graph(
            (u, v, d) for u, v, d in G.edges(data=True) if not d.get("blocked", False)
        )
        for node, data in G.nodes(data=True):
            if not G_active.has_node(node):
                G_active.add_node(node, **data)

        start_node = _nearest_node(G_active, start[0], start[1])
        end_node = _nearest_node(G_active, end[0], end[1])

        if start_node is None or end_node is None:
            raise ValueError("Could not find nodes near the provided coordinates.")

        def heuristic(u, v):
            ud, vd = G_active.nodes[u], G_active.nodes[v]
            return _haversine(ud["lat"], ud["lon"], vd["lat"], vd["lon"])

        try:
            if algorithm == "dijkstra":
                path = nx.dijkstra_path(G_active, start_node, end_node, weight="weight")
                paths = [path]
            elif algorithm == "astar":
                path = nx.astar_path(G_active, start_node, end_node,
                                     heuristic=heuristic, weight="weight")
                paths = [path]
            elif algorithm == "yens":
                paths = list(nx.shortest_simple_paths(G_active, start_node, end_node,
                                                      weight="weight"))[:k]
            else:
                raise ValueError(f"Unknown algorithm: {algorithm}")
        except nx.NetworkXNoPath:
            raise ValueError(
                f"No route found between {start} and {end}. "
                "The road network may be disconnected due to disasters."
            )

        def path_to_response(p: list) -> dict:
            coords = [(G.nodes[n]["lat"], G.nodes[n]["lon"]) for n in p]
            dist = sum(
                _haversine(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])
                for i in range(len(coords) - 1)
            )
            return {
                "route_geojson": _coords_to_geojson_linestring(coords),
                "distance_m": round(dist, 2),
                "duration_estimate_s": round(dist / 13.89, 2),  # ~50 km/h
                "segment_ids": [],
            }

        main = path_to_response(paths[0])
        alternates = [path_to_response(p) for p in paths[1:]]

        return {
            **main,
            "alternate_routes": [a["route_geojson"] for a in alternates],
        }

    def block_segments(self, segment_ids: list[int]) -> None:
        """Mark segments as blocked in the active graph."""
        for G in self._graphs.values():
            for u, v, data in G.edges(data=True):
                if data.get("db_id") in segment_ids:
                    data["blocked"] = True
        logger.info(f"Blocked {len(segment_ids)} segments in all graphs")

    def unblock_segments(self, segment_ids: list[int]) -> None:
        for G in self._graphs.values():
            for u, v, data in G.edges(data=True):
                if data.get("db_id") in segment_ids:
                    data["blocked"] = False


_service: GraphService | None = None


def get_graph_service() -> GraphService:
    global _service
    if _service is None:
        _service = GraphService()
    return _service
