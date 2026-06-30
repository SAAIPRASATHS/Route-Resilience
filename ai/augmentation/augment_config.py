"""
Augmentation configuration for SpaceNet Road Detection training.
Uses Albumentations. Includes occlusion simulation (clouds, shadows).
"""

import albumentations as A
from albumentations.pytorch import ToTensorV2


def get_train_transforms(image_size: int = 512) -> A.Compose:
    """
    Full augmentation pipeline for training.
    Includes occlusion simulation to make the model robust to cloud cover
    — critical for Coimbatore monsoon season satellite imagery.
    """
    return A.Compose([
        # ── Spatial ─────────────────────────────────────────
        A.RandomCrop(height=image_size, width=image_size),
        A.HorizontalFlip(p=0.5),
        A.VerticalFlip(p=0.5),
        A.RandomRotate90(p=0.5),
        A.Transpose(p=0.3),
        A.ShiftScaleRotate(
            shift_limit=0.05, scale_limit=0.1, rotate_limit=15,
            border_mode=0, p=0.4
        ),
        A.ElasticTransform(alpha=1, sigma=50, p=0.2),

        # ── Color / Radiometric ─────────────────────────────
        A.RandomBrightnessContrast(brightness_limit=0.3, contrast_limit=0.3, p=0.5),
        A.HueSaturationValue(
            hue_shift_limit=10, sat_shift_limit=30, val_shift_limit=20, p=0.4
        ),
        A.CLAHE(clip_limit=4.0, tile_grid_size=(8, 8), p=0.3),
        A.RGBShift(r_shift_limit=15, g_shift_limit=15, b_shift_limit=15, p=0.3),

        # ── Noise / Blur ────────────────────────────────────
        A.GaussianBlur(blur_limit=(3, 7), p=0.3),
        A.GaussNoise(var_limit=(10, 50), p=0.3),
        A.MotionBlur(blur_limit=7, p=0.2),

        # ── Occlusion Simulation ────────────────────────────
        # Simulate cloud patches (critical for monsoon-season imagery)
        A.CoarseDropout(
            max_holes=8,
            max_height=image_size // 8,
            max_width=image_size // 8,
            min_holes=2,
            fill_value=255,   # white = cloud
            p=0.4,
        ),
        # Simulate shadows
        A.RandomShadow(
            shadow_roi=(0, 0.5, 1, 1),
            num_shadows_lower=1,
            num_shadows_upper=3,
            shadow_dimension=5,
            p=0.3,
        ),
        # Simulate sensor stripe noise
        A.GridDropout(ratio=0.3, unit_size_min=20, unit_size_max=60, p=0.15),

        # ── Normalise & Convert ─────────────────────────────
        A.Normalize(
            mean=[0.485, 0.456, 0.406],   # ImageNet stats (used by SegFormer)
            std=[0.229, 0.224, 0.225],
        ),
        ToTensorV2(),
    ])


def get_val_transforms(image_size: int = 512) -> A.Compose:
    """Validation transforms — only resize + normalise, no augmentation."""
    return A.Compose([
        A.CenterCrop(height=image_size, width=image_size),
        A.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
        ToTensorV2(),
    ])


def get_inference_transforms() -> A.Compose:
    """No augmentation, no crop — for full-image inference."""
    return A.Compose([
        A.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
        ToTensorV2(),
    ])
