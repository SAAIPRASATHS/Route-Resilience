"""
SegFormer Road Segmentation Model
Base: nvidia/mit-b2 (Mix Transformer encoder)
Head: SegformerDecodeHead — binary road mask output
Trained on SpaceNet Road Detection Dataset
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import (
    SegformerConfig,
    SegformerForSemanticSegmentation,
    SegformerImageProcessor,
)
from loguru import logger


class SegFormerRoad(nn.Module):
    """
    SegFormer-B2 fine-tuned for binary road segmentation.

    Input : RGB image tensor [B, 3, H, W], pixel values 0–1
    Output: logits [B, 1, H//4, W//4]  (upsampled in loss/inference)
    """

    MODEL_ID = "nvidia/mit-b2"

    def __init__(self, pretrained: bool = True):
        super().__init__()

        if pretrained:
            logger.info(f"Loading pretrained encoder: {self.MODEL_ID}")
            self.backbone = SegformerForSemanticSegmentation.from_pretrained(
                self.MODEL_ID,
                num_labels=1,
                ignore_mismatched_sizes=True,
            )
        else:
            config = SegformerConfig.from_pretrained(
                self.MODEL_ID, num_labels=1
            )
            self.backbone = SegformerForSemanticSegmentation(config)

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        """
        Args:
            pixel_values: [B, 3, H, W] — normalised RGB
        Returns:
            logits: [B, 1, H, W] — upsampled to input resolution
        """
        outputs = self.backbone(pixel_values=pixel_values)
        logits = outputs.logits  # [B, 1, H//4, W//4]

        # Upsample to original resolution
        logits = F.interpolate(
            logits,
            size=pixel_values.shape[-2:],
            mode="bilinear",
            align_corners=False,
        )
        return logits  # Raw logits — apply sigmoid + threshold for mask

    @classmethod
    def load_from_checkpoint(cls, path: str, map_location: str = "cpu") -> "SegFormerRoad":
        model = cls(pretrained=False)
        state_dict = torch.load(path, map_location=map_location)
        # Handle DataParallel wrapping
        if all(k.startswith("module.") for k in state_dict.keys()):
            state_dict = {k[7:]: v for k, v in state_dict.items()}
        model.load_state_dict(state_dict, strict=False)
        logger.success(f"Loaded checkpoint from {path}")
        return model

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


# ─── Loss Functions ──────────────────────────────────────────────────────────

class DiceLoss(nn.Module):
    """Dice loss for binary segmentation — handles class imbalance well."""

    def __init__(self, smooth: float = 1.0):
        super().__init__()
        self.smooth = smooth

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        probs = torch.sigmoid(logits)
        batch = logits.shape[0]
        probs_flat = probs.view(batch, -1)
        targets_flat = targets.view(batch, -1)
        intersection = (probs_flat * targets_flat).sum(dim=1)
        dice = (2.0 * intersection + self.smooth) / (
            probs_flat.sum(dim=1) + targets_flat.sum(dim=1) + self.smooth
        )
        return 1.0 - dice.mean()


class CombinedLoss(nn.Module):
    """0.5 × Dice + 0.5 × BCE — standard for road detection."""

    def __init__(self, dice_weight: float = 0.5):
        super().__init__()
        self.dice_weight = dice_weight
        self.bce_weight = 1.0 - dice_weight
        self.dice = DiceLoss()
        self.bce = nn.BCEWithLogitsLoss()

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        return (
            self.dice_weight * self.dice(logits, targets)
            + self.bce_weight * self.bce(logits, targets)
        )


if __name__ == "__main__":
    # Quick sanity check
    model = SegFormerRoad(pretrained=False)
    print(f"Parameters: {model.count_parameters():,}")
    x = torch.randn(2, 3, 512, 512)
    out = model(x)
    print(f"Input:  {x.shape}")
    print(f"Output: {out.shape}")
    assert out.shape == (2, 1, 512, 512)
    print("✅ SegFormerRoad model OK")
