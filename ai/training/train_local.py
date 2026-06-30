"""
Local Training Script for SegFormer-B2 Road Segmentation
=========================================================
Trains on Coimbatore Sentinel-2 + OSM road mask dataset.

Usage:
    python -m ai.training.train_local
"""

import os
import sys
import time
import json
import numpy as np
from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader

# ── Paths ──────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parents[2]  # e:\Reroute
DATASET_DIR = PROJECT_ROOT / "ai" / "datasets" / "coimbatore"
WEIGHTS_DIR = PROJECT_ROOT / "ai" / "weights"

sys.path.insert(0, str(PROJECT_ROOT))

from ai.models.segformer_road import SegFormerRoad, CombinedLoss
from ai.augmentation.augment_config import get_train_transforms, get_val_transforms

# ── Configuration ──────────────────────────────────────────────────────────────

CROP_SIZE = 512
BATCH_SIZE = 2        # CPU-friendly
LEARNING_RATE = 6e-5
MAX_EPOCHS = 50
PATIENCE = 15         # Early stopping
TARGET_IOU = 0.90
NUM_WORKERS = 0       # Windows-safe (no multiprocessing issues)


# ── Dataset ────────────────────────────────────────────────────────────────────

class RoadSegmentationDataset(Dataset):
    """Loads paired satellite image + road mask PNGs."""

    def __init__(self, images_dir: str, masks_dir: str, transform=None):
        self.images_dir = Path(images_dir)
        self.masks_dir = Path(masks_dir)
        self.transform = transform

        mask_files = set(os.listdir(masks_dir))
        self.filenames = sorted([
            f for f in os.listdir(images_dir)
            if f.endswith(".png") and f in mask_files
        ])
        print(f"  Dataset: {len(self.filenames)} image-mask pairs from {images_dir}")

    def __len__(self):
        return len(self.filenames)

    def __getitem__(self, idx):
        fname = self.filenames[idx]

        image = np.array(Image.open(self.images_dir / fname).convert("RGB"))
        mask = np.array(Image.open(self.masks_dir / fname).convert("L"))

        # Normalize mask to 0-1
        mask = (mask > 127).astype(np.float32)

        if self.transform:
            augmented = self.transform(image=image, mask=mask)
            image = augmented["image"]   # [3, H, W] tensor
            mask = augmented["mask"]     # [H, W] tensor

        # Add channel dim: [H, W] → [1, H, W]
        if isinstance(mask, torch.Tensor):
            mask = mask.unsqueeze(0)
        else:
            mask = torch.tensor(mask).unsqueeze(0)

        return image, mask.float()


# ── Metrics ────────────────────────────────────────────────────────────────────

def calculate_iou(logits, targets, threshold=0.5):
    """IoU for binary segmentation."""
    preds = (torch.sigmoid(logits) > threshold).float()
    intersection = (preds * targets).sum()
    union = preds.sum() + targets.sum() - intersection
    if union == 0:
        return 1.0
    return (intersection / union).item()


def calculate_accuracy(logits, targets, threshold=0.5):
    """Pixel-wise accuracy."""
    preds = (torch.sigmoid(logits) > threshold).float()
    correct = (preds == targets).float().sum()
    total = targets.numel()
    return (correct / total).item()


# ── Training ───────────────────────────────────────────────────────────────────

def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss = 0
    total_iou = 0
    total_acc = 0
    n_batches = 0

    for images, masks in loader:
        images = images.to(device)
        masks = masks.to(device)

        optimizer.zero_grad()
        logits = model(images)
        loss = criterion(logits, masks)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        total_loss += loss.item()
        total_iou += calculate_iou(logits.detach(), masks)
        total_acc += calculate_accuracy(logits.detach(), masks)
        n_batches += 1

    return total_loss / n_batches, total_iou / n_batches, total_acc / n_batches


@torch.no_grad()
def validate(model, loader, criterion, device):
    model.eval()
    total_loss = 0
    total_iou = 0
    total_acc = 0
    n_batches = 0

    for images, masks in loader:
        images = images.to(device)
        masks = masks.to(device)

        logits = model(images)
        loss = criterion(logits, masks)

        total_loss += loss.item()
        total_iou += calculate_iou(logits, masks)
        total_acc += calculate_accuracy(logits, masks)
        n_batches += 1

    return total_loss / n_batches, total_iou / n_batches, total_acc / n_batches


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("  🚀 SegFormer-B2 — Coimbatore Road Segmentation Training (Local)")
    print("=" * 70)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"  Device: {device}")
    if device.type == "cpu":
        print("  ⚠️  CPU training — this will be slower than GPU")

    # ── Verify dataset exists ────────────────────────────────────
    train_img_dir = DATASET_DIR / "train" / "images"
    train_mask_dir = DATASET_DIR / "train" / "masks"
    val_img_dir = DATASET_DIR / "val" / "images"
    val_mask_dir = DATASET_DIR / "val" / "masks"

    for d in [train_img_dir, train_mask_dir, val_img_dir, val_mask_dir]:
        if not d.exists():
            print(f"  ❌ Missing: {d}")
            print("  Run prepare_dataset.py first!")
            sys.exit(1)

    # ── Create datasets ──────────────────────────────────────────
    print("\n📦 Loading datasets...")
    train_dataset = RoadSegmentationDataset(
        str(train_img_dir), str(train_mask_dir),
        transform=get_train_transforms(CROP_SIZE),
    )
    val_dataset = RoadSegmentationDataset(
        str(val_img_dir), str(val_mask_dir),
        transform=get_val_transforms(CROP_SIZE),
    )

    train_loader = DataLoader(
        train_dataset, batch_size=BATCH_SIZE,
        shuffle=True, num_workers=NUM_WORKERS, pin_memory=False,
    )
    val_loader = DataLoader(
        val_dataset, batch_size=BATCH_SIZE,
        shuffle=False, num_workers=NUM_WORKERS, pin_memory=False,
    )

    print(f"  Train batches: {len(train_loader)}")
    print(f"  Val batches:   {len(val_loader)}")

    # ── Initialize model ─────────────────────────────────────────
    print("\n🧠 Initializing SegFormer-B2...")
    model = SegFormerRoad(pretrained=True)
    model = model.to(device)
    print(f"  Trainable parameters: {model.count_parameters():,}")

    criterion = CombinedLoss(dice_weight=0.5)
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=LEARNING_RATE, weight_decay=0.01,
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=10, T_mult=2,
    )

    # ── Training loop ────────────────────────────────────────────
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    best_iou = 0.0
    best_epoch = 0
    patience_counter = 0
    history = {
        "train_loss": [], "val_loss": [],
        "train_iou": [], "val_iou": [],
        "train_acc": [], "val_acc": [],
    }

    print(f"\n{'='*70}")
    print(f"  🏋️ TRAINING — Target IoU: {TARGET_IOU*100:.0f}% | Max Epochs: {MAX_EPOCHS} | Patience: {PATIENCE}")
    print(f"{'='*70}\n")

    for epoch in range(1, MAX_EPOCHS + 1):
        epoch_start = time.time()

        # Train
        train_loss, train_iou, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, device,
        )

        # Validate
        val_loss, val_iou, val_acc = validate(
            model, val_loader, criterion, device,
        )

        # Step scheduler
        scheduler.step(epoch)

        # Record history
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["train_iou"].append(train_iou)
        history["val_iou"].append(val_iou)
        history["train_acc"].append(train_acc)
        history["val_acc"].append(val_acc)

        lr = optimizer.param_groups[0]["lr"]
        elapsed = time.time() - epoch_start

        # Print progress
        print(
            f"  Epoch {epoch:3d}/{MAX_EPOCHS} │ "
            f"Train Loss: {train_loss:.4f} IoU: {train_iou:.4f} Acc: {train_acc:.4f} │ "
            f"Val Loss: {val_loss:.4f} IoU: {val_iou:.4f} Acc: {val_acc:.4f} │ "
            f"LR: {lr:.2e} │ {elapsed:.1f}s"
        )

        # Save best model
        if val_iou > best_iou:
            best_iou = val_iou
            best_epoch = epoch
            patience_counter = 0

            save_path = WEIGHTS_DIR / "best_model.pth"
            torch.save(model.state_dict(), str(save_path))
            print(f"        💾 New best model saved! IoU: {best_iou:.4f}")
        else:
            patience_counter += 1

        # Check target
        if val_iou >= TARGET_IOU:
            print(f"\n  🎯 TARGET REACHED! Val IoU: {val_iou:.4f} ≥ {TARGET_IOU:.4f}")
            break

        # Early stopping
        if patience_counter >= PATIENCE:
            print(f"\n  ⏹️ Early stopping at epoch {epoch}. Best IoU: {best_iou:.4f} at epoch {best_epoch}")
            break

    # ── Save training history ────────────────────────────────────
    history_path = WEIGHTS_DIR / "training_history.json"
    with open(str(history_path), "w") as f:
        json.dump(history, f, indent=2)

    # ── Final summary ────────────────────────────────────────────
    print(f"\n{'='*70}")
    print(f"  🏆 TRAINING COMPLETE")
    print(f"{'='*70}")
    print(f"  City:           Coimbatore, Tamil Nadu")
    print(f"  Model:          SegFormer-B2")
    print(f"  Parameters:     {model.count_parameters():,}")
    print(f"  Best Val IoU:   {best_iou:.4f} ({best_iou*100:.1f}%)")
    print(f"  Best Epoch:     {best_epoch}")
    print(f"  Weights:        {WEIGHTS_DIR / 'best_model.pth'}")
    print(f"  History:        {history_path}")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
