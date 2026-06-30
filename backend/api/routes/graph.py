"""Graph API — build road graph from prediction, get critical roads."""

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database.db import get_db
from backend.database.models import CriticalNode, Prediction, RoadSegment
from backend.services.graph_service import get_graph_service

router = APIRouter(prefix="/api/graph", tags=["graph"])


class GraphBuildResponse(BaseModel):
    prediction_id: int
    num_nodes: int
    num_edges: int
    num_segments_stored: int
    graph_stats: dict


class CriticalRoadItem(BaseModel):
    segment_id: int
    centrality_score: float
    length_m: Optional[float]
    geometry: dict          # GeoJSON LineString


class CriticalRoadsResponse(BaseModel):
    total: int
    roads: list[CriticalRoadItem]


class CriticalNodeItem(BaseModel):
    node_id: str
    lat: float
    lon: float
    betweenness: float
    is_articulation_point: bool


@router.post("/build", response_model=GraphBuildResponse)
async def build_graph(
    prediction_id: int = Query(..., description="Prediction ID from /api/roads/extract"),
    db: AsyncSession = Depends(get_db),
):
    """
    Convert a road mask prediction into a routable NetworkX graph.
    Stores road segments and critical nodes in the database.
    AOI defaults to Coimbatore bounds.
    """
    stmt = select(Prediction).where(Prediction.id == prediction_id)
    pred = (await db.execute(stmt)).scalar_one_or_none()
    if pred is None:
        raise HTTPException(status_code=404, detail=f"Prediction {prediction_id} not found")

    if pred.mask_geojson is None:
        raise HTTPException(status_code=400, detail="Prediction has no mask GeoJSON")

    mask_geojson = json.loads(pred.mask_geojson)
    svc = get_graph_service()
    result = svc.build_from_geojson(mask_geojson, prediction_id=prediction_id)

    # Persist road segments
    for seg_data in result["segments"]:
        seg = RoadSegment(
            prediction_id=prediction_id,
            geometry=json.dumps(seg_data["geometry"]),
            length_m=seg_data.get("length_m"),
            weight=seg_data.get("weight", 1.0),
            centrality_score=seg_data.get("centrality"),
            is_critical=seg_data.get("is_critical", False),
        )
        db.add(seg)

    # Persist critical nodes
    for node_data in result["critical_nodes"]:
        node = CriticalNode(
            node_id=node_data["node_id"],
            lat=node_data["lat"],
            lon=node_data["lon"],
            betweenness=node_data.get("betweenness"),
            closeness=node_data.get("closeness"),
            is_articulation_point=node_data.get("is_articulation_point", False),
        )
        db.add(node)

    await db.flush()

    return GraphBuildResponse(
        prediction_id=prediction_id,
        num_nodes=result["num_nodes"],
        num_edges=result["num_edges"],
        num_segments_stored=len(result["segments"]),
        graph_stats=result["stats"],
    )


@router.get("/critical", response_model=CriticalRoadsResponse)
async def get_critical_roads(
    top_n: int = Query(20, ge=1, le=100, description="Number of critical roads to return"),
    prediction_id: Optional[int] = Query(None, description="Filter by prediction"),
    db: AsyncSession = Depends(get_db),
):
    """
    Return the top-N most critical road segments ranked by betweenness centrality.
    These are the roads whose removal would most disrupt connectivity in Coimbatore.
    """
    stmt = select(RoadSegment).where(
        RoadSegment.centrality_score.isnot(None)
    )
    if prediction_id:
        stmt = stmt.where(RoadSegment.prediction_id == prediction_id)
    stmt = stmt.order_by(RoadSegment.centrality_score.desc()).limit(top_n)

    segments = (await db.execute(stmt)).scalars().all()

    roads = [
        CriticalRoadItem(
            segment_id=s.id,
            centrality_score=s.centrality_score or 0.0,
            length_m=s.length_m,
            geometry=json.loads(s.geometry),
        )
        for s in segments
    ]

    return CriticalRoadsResponse(total=len(roads), roads=roads)


@router.get("/nodes/critical")
async def get_critical_nodes(
    top_n: int = Query(20),
    db: AsyncSession = Depends(get_db),
):
    """Return articulation points and high-betweenness nodes in Coimbatore."""
    stmt = (
        select(CriticalNode)
        .order_by(CriticalNode.betweenness.desc())
        .limit(top_n)
    )
    nodes = (await db.execute(stmt)).scalars().all()
    return [
        CriticalNodeItem(
            node_id=n.node_id,
            lat=n.lat,
            lon=n.lon,
            betweenness=n.betweenness or 0.0,
            is_articulation_point=n.is_articulation_point,
        )
        for n in nodes
    ]
