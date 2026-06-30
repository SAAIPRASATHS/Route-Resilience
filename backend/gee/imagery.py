"""
Google Earth Engine — Satellite Imagery Fetcher
Default AOI: Coimbatore, Tamil Nadu, India
Uses Sentinel-2 SR with cloud masking.
"""

from __future__ import annotations

import io
import base64
from datetime import datetime
from typing import Optional

import ee
import numpy as np
from loguru import logger
from PIL import Image

from backend.config import settings


# ─── Sentinel-2 Cloud Masking ────────────────────────────────────────────────

def _mask_s2_clouds(image: ee.Image) -> ee.Image:
    """
    Cloud mask for Sentinel-2 SR using the QA60 band.
    Bits 10 and 11 are opaque clouds and cirrus respectively.
    """
    qa = image.select("QA60")
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    mask = (
        qa.bitwiseAnd(cloud_bit_mask).eq(0)
        .And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    )
    return image.updateMask(mask).divide(10000)


# ─── Core Image Fetch ────────────────────────────────────────────────────────

class SatelliteImageFetcher:
    """
    Fetches and processes Sentinel-2 satellite imagery for a given AOI via GEE.
    Default AOI is Coimbatore city bounds from settings.
    """

    DEFAULT_VIS_PARAMS = {
        "min": 0.0,
        "max": 0.3,
        "bands": ["B4", "B3", "B2"],   # True colour RGB
    }

    NDVI_PARAMS = {
        "min": -1,
        "max": 1,
        "palette": ["blue", "white", "green"],
    }

    def __init__(self):
        self.collection = settings.gee_collection
        self.scale = settings.gee_scale_meters
        self.cloud_threshold = settings.gee_cloud_threshold

    def _get_aoi(
        self,
        bbox: Optional[list[float]] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        radius_km: Optional[float] = None,
    ) -> ee.Geometry:
        """
        Build GEE geometry from bbox or centre + radius.
        Falls back to Coimbatore defaults.
        """
        if bbox:
            xmin, ymin, xmax, ymax = bbox
            return ee.Geometry.Rectangle([xmin, ymin, xmax, ymax])
        elif lat and lon and radius_km:
            return ee.Geometry.Point([lon, lat]).buffer(radius_km * 1000)
        else:
            # Default: Coimbatore
            logger.info("Using default Coimbatore AOI")
            return ee.Geometry.Rectangle(settings.default_bbox)

    def fetch_composite(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        bbox: Optional[list[float]] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        radius_km: Optional[float] = None,
    ) -> dict:
        """
        Fetch a cloud-free Sentinel-2 median composite for the given period and AOI.

        Returns a dict with:
          - thumbnail_b64: base64 PNG thumbnail (RGB true colour)
          - ndvi_b64: base64 PNG NDVI thumbnail
          - image_id: GEE image collection filter info
          - cloud_cover_avg: average cloud cover of filtered collection
          - bbox: [xmin, ymin, xmax, ymax]
          - acquired_start, acquired_end
          - num_images: number of scenes composited
        """
        start = start_date or settings.gee_default_start
        end = end_date or settings.gee_default_end
        aoi = self._get_aoi(bbox, lat, lon, radius_km)

        logger.info(
            f"Fetching S2 composite for {settings.default_city} | "
            f"{start} → {end} | cloud ≤ {self.cloud_threshold}%"
        )

        # Filter collection
        collection = (
            ee.ImageCollection(self.collection)
            .filterBounds(aoi)
            .filterDate(start, end)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", self.cloud_threshold))
            .map(_mask_s2_clouds)
        )

        size = collection.size().getInfo()
        logger.info(f"  → {size} Sentinel-2 scenes found after cloud filter")

        if size == 0:
            logger.warning("No cloud-free scenes found — relaxing cloud threshold to 50%")
            collection = (
                ee.ImageCollection(self.collection)
                .filterBounds(aoi)
                .filterDate(start, end)
                .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 50))
                .map(_mask_s2_clouds)
            )
            size = collection.size().getInfo()

        # Median composite
        composite = collection.median().clip(aoi)

        # Compute NDVI
        ndvi = composite.normalizedDifference(["B8", "B4"]).rename("NDVI")

        # Generate thumbnails
        thumb_rgb = composite.getThumbURL({
            **self.DEFAULT_VIS_PARAMS,
            "region": aoi,
            "dimensions": 1024,
            "format": "png",
        })

        thumb_ndvi = ndvi.getThumbURL({
            **self.NDVI_PARAMS,
            "region": aoi,
            "dimensions": 1024,
            "format": "png",
        })

        # Get actual bbox from AOI
        bounds = aoi.bounds().getInfo()["coordinates"][0]
        lons = [c[0] for c in bounds]
        lats = [c[1] for c in bounds]
        actual_bbox = [min(lons), min(lats), max(lons), max(lats)]

        logger.success(f"Composite ready: {size} scenes | AOI {actual_bbox}")

        return {
            "thumbnail_url": thumb_rgb,
            "ndvi_url": thumb_ndvi,
            "num_images": size,
            "cloud_threshold": self.cloud_threshold,
            "bbox": actual_bbox,
            "acquired_start": start,
            "acquired_end": end,
            "city": settings.default_city,
            "collection": self.collection,
            "scale_m": self.scale,
        }

    def export_geotiff_to_drive(
        self,
        task_name: str = "coimbatore_s2",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        bbox: Optional[list[float]] = None,
        drive_folder: str = "reroute-ai",
    ) -> dict:
        """
        Export a full-resolution GeoTIFF to Google Drive.
        Returns the GEE task ID so you can poll its status.
        Used by the Colab notebook for training data collection.
        """
        start = start_date or settings.gee_default_start
        end = end_date or settings.gee_default_end
        aoi = self._get_aoi(bbox)

        collection = (
            ee.ImageCollection(self.collection)
            .filterBounds(aoi)
            .filterDate(start, end)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", self.cloud_threshold))
            .map(_mask_s2_clouds)
        )

        composite = collection.median().select(["B4", "B3", "B2"]).clip(aoi)

        task = ee.batch.Export.image.toDrive(
            image=composite,
            description=task_name,
            folder=drive_folder,
            fileNamePrefix=f"{task_name}_{start}_{end}",
            region=aoi,
            scale=self.scale,
            crs="EPSG:4326",
            maxPixels=1e13,
        )
        task.start()
        logger.info(f"GEE export task started: {task.id}")
        return {"task_id": task.id, "status": "RUNNING", "drive_folder": drive_folder}


# ─── Singleton ───────────────────────────────────────────────────────────────
_fetcher: SatelliteImageFetcher | None = None


def get_fetcher() -> SatelliteImageFetcher:
    global _fetcher
    if _fetcher is None:
        _fetcher = SatelliteImageFetcher()
    return _fetcher
