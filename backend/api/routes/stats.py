"""Stats API — system-wide statistics dashboard."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database.db import get_db
from backend.database.models import (
    Disaster, EventLog, Prediction, RoadSegment, Route, SatelliteImage
)

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """
    Dashboard statistics for Coimbatore Route Resilience AI.
    Returns counts, latest activity, and system health.
    """
    # Counts
    satellite_count = (await db.execute(select(func.count(SatelliteImage.id)))).scalar() or 0
    prediction_count = (await db.execute(select(func.count(Prediction.id)))).scalar() or 0
    segment_count = (await db.execute(select(func.count(RoadSegment.id)))).scalar() or 0
    blocked_count = (
        await db.execute(
            select(func.count(RoadSegment.id)).where(RoadSegment.is_blocked == True)
        )
    ).scalar() or 0
    critical_count = (
        await db.execute(
            select(func.count(RoadSegment.id)).where(RoadSegment.is_critical == True)
        )
    ).scalar() or 0
    route_count = (await db.execute(select(func.count(Route.id)))).scalar() or 0
    active_disasters = (
        await db.execute(
            select(func.count(Disaster.id)).where(Disaster.is_active == True)
        )
    ).scalar() or 0

    # Latest satellite image
    latest_img = (
        await db.execute(
            select(SatelliteImage).order_by(SatelliteImage.created_at.desc()).limit(1)
        )
    ).scalar_one_or_none()

    return {
        "city": settings.default_city,
        "center": {"lat": settings.default_lat, "lon": settings.default_lon},
        "counts": {
            "satellite_images": satellite_count,
            "predictions": prediction_count,
            "road_segments": segment_count,
            "blocked_segments": blocked_count,
            "critical_segments": critical_count,
            "routes_computed": route_count,
            "active_disasters": active_disasters,
        },
        "network_health": {
            "blocked_pct": round(
                (blocked_count / segment_count * 100) if segment_count > 0 else 0, 2
            ),
            "status": "critical" if active_disasters > 0 else "operational",
        },
        "latest_satellite": {
            "id": latest_img.id if latest_img else None,
            "acquired_start": latest_img.acquired_start if latest_img else None,
            "acquired_end": latest_img.acquired_end if latest_img else None,
        } if latest_img else None,
        "model": {
            "version": settings.model_weights_path.split("/")[-1],
            "device": settings.model_device,
        },
    }
