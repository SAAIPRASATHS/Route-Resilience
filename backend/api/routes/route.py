"""Route API — find optimal paths through the Coimbatore road graph."""

import json
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db import get_db
from backend.database.models import Route
from backend.services.graph_service import get_graph_service

router = APIRouter(prefix="/api/route", tags=["routing"])


class RouteRequest(BaseModel):
    start_lat: float = Field(..., example=11.0168, description="Start point latitude")
    start_lon: float = Field(..., example=76.9558, description="Start point longitude")
    end_lat: float = Field(..., example=11.0500, description="End point latitude")
    end_lon: float = Field(..., example=77.0000, description="End point longitude")
    algorithm: Literal["dijkstra", "astar", "yens"] = "astar"
    k_paths: int = Field(3, ge=1, le=10, description="Number of alternate paths (Yen's K only)")
    is_emergency: bool = False
    prediction_id: Optional[int] = None


class RouteResponse(BaseModel):
    route_id: int
    algorithm: str
    start_point: str
    end_point: str
    distance_m: float
    duration_estimate_s: float
    route_geojson: dict         # GeoJSON LineString
    alternate_routes: list[dict]  # for Yen's K-shortest
    num_segments: int
    is_emergency: bool


@router.post("", response_model=RouteResponse)
async def find_route(
    req: RouteRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Find the optimal route between two points in Coimbatore.

    Algorithms:
      - **dijkstra**: Classical shortest path (by distance)
      - **astar**: A* with geographic heuristic (faster, same result)
      - **yens**: Yen's K-Shortest Paths — returns k alternate routes

    For emergency routing, blocked segments are automatically bypassed.
    """
    svc = get_graph_service()

    if not svc.has_graph(req.prediction_id):
        raise HTTPException(
            status_code=404,
            detail=(
                "No road graph available. "
                "Run POST /api/graph/build first with a prediction_id."
            )
        )

    try:
        result = svc.find_route(
            start=(req.start_lat, req.start_lon),
            end=(req.end_lat, req.end_lon),
            algorithm=req.algorithm,
            k=req.k_paths,
            prediction_id=req.prediction_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Routing failed: {exc}")

    # Persist route
    route = Route(
        start_point=f"{req.start_lat},{req.start_lon}",
        end_point=f"{req.end_lat},{req.end_lon}",
        algorithm=req.algorithm,
        route_geometry=json.dumps(result["route_geojson"]),
        distance_m=result["distance_m"],
        duration_estimate_s=result["duration_estimate_s"],
        segment_ids=json.dumps(result.get("segment_ids", [])),
        is_emergency=req.is_emergency,
    )
    db.add(route)
    await db.flush()

    return RouteResponse(
        route_id=route.id,
        algorithm=req.algorithm,
        start_point=route.start_point,
        end_point=route.end_point,
        distance_m=result["distance_m"],
        duration_estimate_s=result["duration_estimate_s"],
        route_geojson=result["route_geojson"],
        alternate_routes=result.get("alternate_routes", []),
        num_segments=len(result.get("segment_ids", [])),
        is_emergency=req.is_emergency,
    )
