"""Satellite imagery API — fetches Coimbatore imagery from GEE."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
import json

from backend.config import settings
from backend.database.db import get_db
from backend.database.models import SatelliteImage
from backend.gee.imagery import get_fetcher

router = APIRouter(prefix="/api/satellite", tags=["satellite"])


class SatelliteResponse(BaseModel):
    id: int
    city: str
    thumbnail_url: str
    ndvi_url: str
    num_images: int
    bbox: list[float]
    acquired_start: str
    acquired_end: str
    cloud_threshold: int
    scale_m: int
    collection: str


@router.get("", response_model=SatelliteResponse)
async def get_satellite_image(
    lat: Optional[float] = Query(None, description="Centre latitude (default: Coimbatore)"),
    lon: Optional[float] = Query(None, description="Centre longitude (default: Coimbatore)"),
    radius_km: Optional[float] = Query(None, description="Radius in km"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch the latest cloud-free Sentinel-2 composite for Coimbatore (or custom AOI).
    Saves record to DB and returns thumbnail URLs.
    """
    try:
        fetcher = get_fetcher()
        result = fetcher.fetch_composite(
            start_date=start_date,
            end_date=end_date,
            lat=lat,
            lon=lon,
            radius_km=radius_km,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"GEE fetch failed: {exc}")

    # Persist record
    record = SatelliteImage(
        city=result["city"],
        bbox=json.dumps(result["bbox"]),
        acquired_start=result["acquired_start"],
        acquired_end=result["acquired_end"],
        cloud_cover_pct=float(result["cloud_threshold"]),
    )
    db.add(record)
    await db.flush()

    return SatelliteResponse(
        id=record.id,
        city=result["city"],
        thumbnail_url=result["thumbnail_url"],
        ndvi_url=result["ndvi_url"],
        num_images=result["num_images"],
        bbox=result["bbox"],
        acquired_start=result["acquired_start"],
        acquired_end=result["acquired_end"],
        cloud_threshold=result["cloud_threshold"],
        scale_m=result["scale_m"],
        collection=result["collection"],
    )


@router.post("/export")
async def export_to_drive(
    start_date: str = Query(settings.gee_default_start),
    end_date: str = Query(settings.gee_default_end),
    drive_folder: str = Query("reroute-ai"),
):
    """
    Trigger a GEE Export task → saves full-resolution GeoTIFF to Google Drive.
    Use this to collect training data for the Colab notebook.
    """
    try:
        fetcher = get_fetcher()
        result = fetcher.export_geotiff_to_drive(
            task_name=f"coimbatore_s2_{start_date}_{end_date}",
            start_date=start_date,
            end_date=end_date,
            drive_folder=drive_folder,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))
