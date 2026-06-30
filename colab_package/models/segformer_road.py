"""
SegFormer Road Segmentation Model
Base: nvidia/mit-b2 (Mix Transformer encoder)
Head: SegformerDecodeHead — binary road mask output
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import (
    SegformerConfig,
    SegformerForSemanticSegmentation,
)


class SegFormerRoad(nn.Module):
    """
    SegFormer-B2 fine-tuned for binary road segmentation.
    Input : RGB image tensor [B, 3, H, W], pixel values 0–1
    Output: logits [B, 1, H, W]
    """

    MODEL_ID = "nvidia/mit-b2"

    def __init__(self, pretrained: bool = True):
        super().__init__()
        if pretrained:
            print(f"[MODEL] Loading pretrained encoder: {self.MODEL_ID}")
            self.backbone = SegformerForSemanticSegmentation.from_pretrained(
                self.MODEL_ID,
                num_labels=1,
                ignore_mismatched_sizes=True,
            )
        else:
            config = SegformerConfig.from_pretrained(self.MODEL_ID, num_labels=1)
            self.backbone = SegformerForSemanticSegmentation(config)

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        outputs = self.backbone(pixel_values=pixel_values)
        logits = outputs.logits
        logits = F.interpolate(
            logits,
            size=pixel_values.shape[-2:],
            mode="bilinear",
            align_corners=False,
        )
        return logits

    @classmethod
    def load_from_checkpoint(cls, path: str, map_location: str = "cpu"):
        model = cls(pretrained=False)
        state_dict = torch.load(path, map_location=map_location)
        if all(k.startswith("module.") for k in state_dict.keys()):
            state_dict = {k[7:]: v for k, v in state_dict.items()}
        model.load_state_dict(state_dict, strict=False)
        print(f"[MODEL] Loaded checkpoint from {path}")
        return model

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


class DiceLoss(nn.Module):
    def __init__(self, smooth: float = 1.0):
        super().__init__()
        self.smooth = smooth

    def forward(self, logits, targets):
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
    """0.5 × Dice + 0.5 × BCE"""
    def __init__(self, dice_weight: float = 0.5):
        super().__init__()
        self.dice_weight = dice_weight
        self.bce_weight = 1.0 - dice_weight
        self.dice = DiceLoss()
        self.bce = nn.BCEWithLogitsLoss()

    def forward(self, logits, targets):
        return (
            self.dice_weight * self.dice(logits, targets)
            + self.bce_weight * self.bce(logits, targets)
        )
