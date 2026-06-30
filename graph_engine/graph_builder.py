"""
Graph Builder — Converts road skeleton pixels or GeoJSON traces into a NetworkX graph.
"""

from loguru import logger
import networkx as nx
import numpy as np


def build_network_graph(geojson_data: dict) -> nx.Graph:
    """
    Constructs a NetworkX undirected graph from a GeoJSON FeatureCollection of LineStrings.
    Includes node features (lat, lon) and edge weights (distance in meters).
    """
    G = nx.Graph()
    features = geojson_data.get("features", [])

    node_id_counter = 0
    coord_to_node = {}

    def get_node(lat: float, lon: float) -> int:
        nonlocal node_id_counter
        # Round coords to ~1m resolution to merge duplicate nodes
        coord_key = (round(lat, 5), round(lon, 5))
        if coord_key not in coord_to_node:
            coord_to_node[coord_key] = node_id_counter
            G.add_node(node_id_counter, lat=lat, lon=lon)
            node_id_counter += 1
        return coord_to_node[coord_key]

    for feat in features:
        geom = feat.get("geometry", {})
        if geom.get("type") != "LineString":
            continue

        coordinates = geom["coordinates"]  # [[lon, lat], ...]
        if len(coordinates) < 2:
            continue

        # Convert to lat-lon node list
        nodes = []
        for coord in coordinates:
            lon, lat = coord
            nodes.append(get_node(lat, lon))

        # Add edges between sequential points
        for i in range(len(nodes) - 1):
            u, v = nodes[i], nodes[i + 1]
            if u == v:
                continue

            # Compute weight as haversine distance
            u_data = G.nodes[u]
            v_data = G.nodes[v]
            dist = haversine_distance(
                u_data["lat"], u_data["lon"], v_data["lat"], v_data["lon"]
            )

            # Keep existing edge if shorter
            if G.has_edge(u, v):
                if G[u][v]["weight"] > dist:
                    G[u][v]["weight"] = dist
                    G[u][v]["length_m"] = dist
            else:
                G.add_edge(u, v, weight=dist, length_m=dist, blocked=False)

    logger.info(f"Built network graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    return G


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in meters between two points using the Haversine formula."""
    import math

    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c
