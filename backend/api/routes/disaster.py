"""Disaster simulation API — flood Coimbatore zones and reroute."""

import json
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db import get_db
from backend.database.models import Disaster, RoadSegment
from backend.services.graph_service import get_graph_service
from backend.websocket.manager import ws_manager

router = APIRouter(prefix="/api/disaster", tags=["disaster"])


class DisasterSimulateRequest(BaseModel):
    name: str = Field(..., example="Noyyal River Flood 2024")
    disaster_type: Literal["flood", "landslide", "fire", "bridge_collapse"] = "flood"
    severity: Literal["low", "moderate", "high"] = "moderate"
    # GeoJSON Polygon of affected area
    geometry: dict = Field(
        ...,
        example={
            "type": "Polygon",
            "coordinates": [[[76.90, 10.95], [76.95, 10.95],
                              [76.95, 11.00], [76.90, 11.00],
                              [76.90, 10.95]]]
        }
    )
    # Optional alternative route endpoints to find after blocking
    alt_route_start: list[float] | None = None   # [lat, lon]
    alt_route_end: list[float] | None = None     # [lat, lon]


class DisasterSimulateResponse(BaseModel):
    disaster_id: int
    disaster_type: str
    blocked_segments: int
    alternate_route: dict | None   # GeoJSON of new route bypassing disaster
    ws_event_sent: bool


@router.post("/simulate", response_model=DisasterSimulateResponse)
async def simulate_disaster(
    req: DisasterSimulateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Simulate a disaster event in Coimbatore:
      1. Mark all road segments within the disaster polygon as blocked
      2. Update the in-memory graph (remove blocked edges)
      3. Re-run routing to find alternate path (if start/end provided)
      4. Push real-time update via WebSocket to all connected dashboards
      5. Persist the disaster event to DB

    Example: Simulate flooding near Noyyal River, Coimbatore.
    """
    svc = get_graph_service()
    geojson_str = json.dumps(req.geometry)

    # 1. Find and block intersecting road segments
    from shapely.geometry import shape, mapping
    from shapely.ops import unary_union

    disaster_polygon = shape(req.geometry)

    stmt = select(RoadSegment).where(RoadSegment.is_blocked == False)
    all_segments = (await db.execute(stmt)).scalars().all()

    blocked_ids = []
    for seg in all_segments:
        try:
            seg_geom = shape(json.loads(seg.geometry))
            if disaster_polygon.intersects(seg_geom):
                blocked_ids.append(seg.id)
        except Exception:
            continue

    if blocked_ids:
        await db.execute(
            update(RoadSegment)
            .where(RoadSegment.id.in_(blocked_ids))
            .values(is_blocked=True)
        )

    # 2. Update in-memory graph
    svc.block_segments(blocked_ids)

    # 3. Find alternate route if endpoints provided
    alt_route_geojson = None
    if req.alt_route_start and req.alt_route_end:
        try:
            result = svc.find_route(
                start=tuple(req.alt_route_start),
                end=tuple(req.alt_route_end),
                algorithm="astar",
            )
            alt_route_geojson = result["route_geojson"]
        except Exception:
            alt_route_geojson = None

    # 4. Persist disaster
    disaster = Disaster(
        name=req.name,
        disaster_type=req.disaster_type,
        geometry=geojson_str,
        severity=req.severity,
        is_active=True,
        blocked_segment_ids=json.dumps(blocked_ids),
    )
    db.add(disaster)
    await db.flush()

    # 5. Push WebSocket event
    ws_sent = await ws_manager.broadcast({
        "event": "disaster_alert",
        "disaster_id": disaster.id,
        "type": req.disaster_type,
        "severity": req.severity,
        "name": req.name,
        "blocked_segments": len(blocked_ids),
        "geometry": req.geometry,
        "alternate_route": alt_route_geojson,
        "city": "Coimbatore",
    })

    return DisasterSimulateResponse(
        disaster_id=disaster.id,
        disaster_type=req.disaster_type,
        blocked_segments=len(blocked_ids),
        alternate_route=alt_route_geojson,
        ws_event_sent=ws_sent,
    )


@router.delete("/{disaster_id}/clear")
async def clear_disaster(
    disaster_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a disaster event and unblock affected road segments."""
    stmt = select(Disaster).where(Disaster.id == disaster_id)
    disaster = (await db.execute(stmt)).scalar_one_or_none()
    if disaster is None:
        raise HTTPException(status_code=404, detail="Disaster not found")

    blocked_ids = json.loads(disaster.blocked_segment_ids or "[]")
    if blocked_ids:
        await db.execute(
            update(RoadSegment)
            .where(RoadSegment.id.in_(blocked_ids))
            .values(is_blocked=False)
        )
        get_graph_service().unblock_segments(blocked_ids)

    disaster.is_active = False
    await ws_manager.broadcast({"event": "disaster_cleared", "disaster_id": disaster_id})

    return {"status": "cleared", "unblocked_segments": len(blocked_ids)}
