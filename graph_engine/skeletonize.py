"""
Skeletonization of binary road mask images.
Uses scikit-image morphology functions.
"""

from loguru import logger
import numpy as np


def extract_skeleton(binary_mask: np.ndarray) -> np.ndarray:
    """
    Convert a binary road mask (values 0 and 1 or 255) into a 1-pixel wide skeleton.
    Input shape: [H, W]
    Output shape: [H, W], values: 0 and 1
    """
    try:
        from skimage.morphology import skeletonize
        # Ensure binary
        mask_bool = binary_mask > 0
        skeleton = skeletonize(mask_bool)
        return skeleton.astype(np.uint8)
    except Exception as exc:
        logger.error(f"Skeletonization failed: {exc}")
        # Fallback to thresholding if skimage fails or is not installed
        return (binary_mask > 127).astype(np.uint8)
