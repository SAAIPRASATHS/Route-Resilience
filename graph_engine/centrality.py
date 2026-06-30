"""
Critical Road Analysis & Centrality Computations.
Detects articulation points, bridges, betweenness, and closeness centrality.
"""

from typing import Dict, List, Tuple, Any
import networkx as nx


def analyze_critical_infrastructure(G: nx.Graph) -> Dict[str, Any]:
    """
    Analyzes the graph to identify critical components.
    Returns dictionaries of betweenness centrality, articulation points, and bridges.
    """
    # Use largest connected component to make calculations meaningful
    if G.number_of_nodes() == 0:
        return {
            "edge_betweenness": {},
            "node_betweenness": {},
            "articulation_points": [],
            "bridges": [],
        }

    largest_cc = max(nx.connected_components(G), key=len)
    G_cc = G.subgraph(largest_cc).copy()

    # Edge betweenness
    edge_bc = nx.edge_betweenness_centrality(G_cc, weight="weight", normalized=True)

    # Node betweenness
    node_bc = nx.betweenness_centrality(G_cc, weight="weight", normalized=True)

    # Articulation points (nodes whose removal increases the number of connected components)
    articulation_pts = list(nx.articulation_points(G_cc))

    # Bridges (edges whose removal disconnects the graph)
    bridges = list(nx.bridges(G_cc))

    return {
        "edge_betweenness": edge_bc,
        "node_betweenness": node_bc,
        "articulation_points": articulation_pts,
        "bridges": bridges,
    }
