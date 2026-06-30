"""
Inference Service — SegFormer road prediction wrapper.
Handles model loading, sliding-window inference, and GeoJSON conversion.
Falls back to a mock result if model weights are not yet available (pre-training).
"""

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import numpy as np
from loguru import logger
from PIL import Image

from backend.config import settings


class InferenceService:
    """
    Wraps the SegFormer model for road mask prediction.
    Lazy-loads the model on first use.
    """

    def __init__(self):
        self._model = None
        self._processor = None
        self._device = settings.model_device
        self._weights_path = Path(settings.model_weights_path)
        self._tile_size = settings.inference_tile_size
        self._overlap = settings.inference_overlap

    def _load_model(self):
        """Load SegFormer weights. Falls back to mock if weights don't exist."""
        if self._model is not None:
            return

        if not self._weights_path.exists():
            logger.warning(
                f"Model weights not found at {self._weights_path}. "
                "Running in MOCK mode — train the model via the Colab notebook first."
            )
            self._model = "mock"
            return

        try:
            import torch
            from transformers import SegformerImageProcessor
            from ai.models.segformer_road import SegFormerRoad

            logger.info(f"Loading SegFormer from {self._weights_path} on {self._device}")
            self._processor = SegformerImageProcessor.from_pretrained("nvidia/mit-b2")
            self._model = SegFormerRoad.load_from_checkpoint(
                str(self._weights_path), map_location=self._device
            )
            self._model.eval()
            logger.success("SegFormer model loaded ✓")
        except Exception as exc:
            logger.error(f"Failed to load model: {exc}. Falling back to mock.")
            self._model = "mock"

    async def predict_from_bytes(self, image_bytes: bytes) -> dict:
        self._load_model()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return self._run_inference(image)

    async def predict_from_path(self, path: str) -> dict:
        self._load_model()
        image = Image.open(path).convert("RGB")
        return self._run_inference(image)

    def _run_inference(self, image: Image.Image) -> dict:
        if self._model == "mock":
            return self._mock_result(image)

        import torch
        import torch.nn.functional as F

        w, h = image.size
        tile = self._tile_size
        overlap = self._overlap
        stride = tile - overlap

        canvas = np.zeros((h, w), dtype=np.float32)
        counts = np.zeros((h, w), dtype=np.float32)

        img_array = np.array(image)

        for y in range(0, h, stride):
            for x in range(0, w, stride):
                y_end = min(y + tile, h)
                x_end = min(x + tile, w)
                crop = img_array[y:y_end, x:x_end]
                crop_img = Image.fromarray(crop)

                inputs = self._processor(images=crop_img, return_tensors="pt")
                inputs = {k: v.to(self._device) for k, v in inputs.items()}

                with torch.no_grad():
                    logits = self._model(**inputs).logits
                    prob = torch.sigmoid(logits).squeeze().cpu().numpy()

                prob_resized = np.array(
                    Image.fromarray((prob * 255).astype(np.uint8)).resize(
                        (x_end - x, y_end - y), Image.BILINEAR
                    )
                ) / 255.0

                canvas[y:y_end, x:x_end] += prob_resized
                counts[y:y_end, x:x_end] += 1

        counts = np.maximum(counts, 1)
        prob_map = canvas / counts
        mask = (prob_map > 0.5).astype(np.uint8)

        geojson = self._mask_to_geojson(mask)
        return {"geojson": geojson, "mask": mask.tolist()}

    def _mock_result(self, image: Image.Image) -> dict:
        """
        Returns a plausible mock road network for Coimbatore centre
        when model weights are not yet available.
        Useful for frontend / API development before training completes.
        """
        logger.info("Returning mock road extraction result for Coimbatore")
        # Mock: a simple grid of roads near Coimbatore centre
        mock_geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [76.9558, 11.0168],
                            [76.9700, 11.0200],
                            [76.9850, 11.0150],
                        ],
                    },
                    "properties": {"road_class": "primary", "mock": True},
                },
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [76.9300, 11.0000],
                            [76.9558, 11.0168],
                            [76.9600, 11.0400],
                        ],
                    },
                    "properties": {"road_class": "secondary", "mock": True},
                },
            ],
        }
        return {"geojson": mock_geojson, "mask": None, "iou_score": None}

    def _mask_to_geojson(self, mask: np.ndarray) -> dict:
        """
        Convert binary road mask to GeoJSON LineStrings.
        Uses skeletonization + contour tracing.
        Coordinates are in pixel space — caller should georeference if needed.
        """
        try:
            from skimage.morphology import skeletonize
            import cv2

            skeleton = skeletonize(mask).astype(np.uint8) * 255
            contours, _ = cv2.findContours(skeleton, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
            features = []
            for contour in contours:
                if len(contour) < 2:
                    continue
                coords = [[float(p[0][0]), float(p[0][1])] for p in contour]
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": coords},
                    "properties": {},
                })
            return {"type": "FeatureCollection", "features": features}
        except ImportError:
            return {"type": "FeatureCollection", "features": []}


_service: InferenceService | None = None


def get_inference_service() -> InferenceService:
    global _service
    if _service is None:
        _service = InferenceService()
    return _service
