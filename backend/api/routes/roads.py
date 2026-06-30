"""Roads API — run SegFormer inference on a satellite image."""

import time
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database.db import get_db
from backend.database.models import Prediction, SatelliteImage
from backend.services.inference_service import get_inference_service

router = APIRouter(prefix="/api/roads", tags=["roads"])


class RoadExtractionResponse(BaseModel):
    prediction_id: int
    image_id: Optional[int]
    mask_geojson: dict          # GeoJSON FeatureCollection of road lines
    iou_score: Optional[float]
    inference_time_ms: int
    model_version: str
    num_road_segments: int


@router.post("/extract", response_model=RoadExtractionResponse)
async def extract_roads(
    image_file: Optional[UploadFile] = File(None, description="Upload a GeoTIFF or PNG"),
    image_id: Optional[int] = Query(None, description="Use a previously fetched satellite image ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Run SegFormer road extraction on:
      - An uploaded satellite image (GeoTIFF or PNG), OR
      - A previously stored image (by image_id from /api/satellite)

    Returns a GeoJSON FeatureCollection of road LineStrings for Coimbatore.
    """
    if image_file is None and image_id is None:
        raise HTTPException(
            status_code=400,
            detail="Provide either an uploaded image file or an image_id."
        )

    svc = get_inference_service()
    start_ts = time.time()

    if image_file is not None:
        # Read uploaded bytes
        image_bytes = await image_file.read()
        result = await svc.predict_from_bytes(image_bytes)
        sat_image_id = None
    else:
        # Load from DB record path
        from sqlalchemy import select
        stmt = select(SatelliteImage).where(SatelliteImage.id == image_id)
        sat_img = (await db.execute(stmt)).scalar_one_or_none()
        if sat_img is None:
            raise HTTPException(status_code=404, detail=f"SatelliteImage {image_id} not found")
        if sat_img.storage_path is None:
            raise HTTPException(
                status_code=400,
                detail="This image was not exported to disk. Use /api/satellite/export first."
            )
        result = await svc.predict_from_path(sat_img.storage_path)
        sat_image_id = image_id

    elapsed_ms = int((time.time() - start_ts) * 1000)

    # Persist prediction
    pred = Prediction(
        image_id=sat_image_id,
        model_version=settings.model_weights_path.split("/")[-1].replace(".pth", ""),
        mask_geojson=json.dumps(result["geojson"]),
        inference_time_ms=elapsed_ms,
    )
    db.add(pred)
    await db.flush()

    return RoadExtractionResponse(
        prediction_id=pred.id,
        image_id=sat_image_id,
        mask_geojson=result["geojson"],
        iou_score=result.get("iou_score"),
        inference_time_ms=elapsed_ms,
        model_version=pred.model_version,
        num_road_segments=len(result["geojson"].get("features", [])),
    )
