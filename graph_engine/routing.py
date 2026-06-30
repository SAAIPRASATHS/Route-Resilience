"""
Routing Engine — Implementations of Dijkstra, A*, and Yen's K Shortest Paths.
"""

from typing import List, Tuple, Any
import networkx as nx


def find_shortest_path(
    G: nx.Graph,
    start_node: int,
    end_node: int,
    algorithm: str = "astar",
    k: int = 3,
) -> List[List[int]]:
    """
    Find routes using Dijkstra, A*, or Yen's K-Shortest Paths.
    Returns a list of paths (each path is a list of node IDs).
    """
    # Filter out blocked paths
    active_edges = [(u, v, d) for u, v, d in G.edges(data=True) if not d.get("blocked", False)]
    G_active = nx.Graph()
    G_active.add_nodes_from(G.nodes(data=True))
    G_active.add_edges_from(active_edges)

    if start_node not in G_active or end_node not in G_active:
        raise ValueError("Start or End node not found in active graph network.")

    def heuristic(u, v):
        # Geographic distance heuristic for A*
        u_data = G_active.nodes[u]
        v_data = G_active.nodes[v]
        from graph_engine.graph_builder import haversine_distance
        return haversine_distance(u_data["lat"], u_data["lon"], v_data["lat"], v_data["lon"])

    try:
        if algorithm == "dijkstra":
            path = nx.dijkstra_path(G_active, start_node, end_node, weight="weight")
            return [path]
        elif algorithm == "astar":
            path = nx.astar_path(
                G_active, start_node, end_node, heuristic=heuristic, weight="weight"
            )
            return [path]
        elif algorithm == "yens":
            paths = list(
                nx.shortest_simple_paths(G_active, start_node, end_node, weight="weight")
            )
            return paths[:k]
        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")
    except nx.NetworkXNoPath:
        raise ValueError("No routing path available between selected endpoints.")
    except Exception as exc:
        raise ValueError(f"Routing execution error: {exc}")
