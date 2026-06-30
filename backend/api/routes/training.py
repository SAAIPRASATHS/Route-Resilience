"""
Training API — real-time SegFormer training with WebSocket epoch streaming.
POST  /api/training/start    — launch training in background thread
POST  /api/training/stop     — signal graceful stop
GET   /api/training/status   — current state, epoch, metrics
GET   /api/training/history  — full epoch-by-epoch history
GET   /api/training/accuracy — evaluate existing weights on val set
"""

from __future__ import annotations

import asyncio
import json
import threading
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException
from loguru import logger

from backend.config import settings
from backend.websocket.manager import ws_manager

router = APIRouter(prefix="/api/training", tags=["training"])

# ─── Shared State ────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATASET_DIR  = PROJECT_ROOT / "ai" / "datasets" / "coimbatore"
WEIGHTS_DIR  = PROJECT_ROOT / "ai" / "weights"
HISTORY_PATH = WEIGHTS_DIR / "training_history.json"

_state: dict[str, Any] = {
    "status":      "idle",       # idle | running | done | error | stopped
    "job_id":      None,
    "epoch":       0,
    "max_epochs":  0,
    "best_iou":    0.0,
    "best_acc":    0.0,
    "best_epoch":  0,
    "started_at":  None,
    "finished_at": None,
    "error":       None,
    "history": {
        "train_loss": [], "val_loss": [],
        "train_iou":  [], "val_iou":  [],
        "train_acc":  [], "val_acc":  [],
    },
}
_stop_event = threading.Event()
_lock       = threading.Lock()
_loop: asyncio.AbstractEventLoop | None = None   # captured at startup


def _broadcast_sync(data: dict) -> None:
    """Thread-safe broadcast: post coroutine to the event loop captured at startup."""
    if _loop and not _loop.is_closed():
        asyncio.run_coroutine_threadsafe(ws_manager.broadcast(data), _loop)


# ─── Background Training Thread ──────────────────────────────────────────────

def _run_training(max_epochs: int, batch_size: int, lr: float) -> None:
    global _state

    try:
        import sys
        sys.path.insert(0, str(PROJECT_ROOT))

        import torch
        from torch.utils.data import DataLoader

        from ai.models.segformer_road     import SegFormerRoad, CombinedLoss
        from ai.augmentation.augment_config import get_train_transforms, get_val_transforms
        from ai.training.train_local        import (
            RoadSegmentationDataset,
            calculate_iou,
            calculate_accuracy,
        )

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # ── Verify dataset ────────────────────────────────────
        train_img  = DATASET_DIR / "train" / "images"
        train_mask = DATASET_DIR / "train" / "masks"
        val_img    = DATASET_DIR / "val"   / "images"
        val_mask   = DATASET_DIR / "val"   / "masks"

        for d in [train_img, train_mask, val_img, val_mask]:
            if not d.exists():
                raise FileNotFoundError(f"Dataset directory missing: {d}")

        # ── DataLoaders ───────────────────────────────────────
        train_ds = RoadSegmentationDataset(str(train_img), str(train_mask),
                                           transform=get_train_transforms(512))
        val_ds   = RoadSegmentationDataset(str(val_img),   str(val_mask),
                                           transform=get_val_transforms(512))

        train_loader = DataLoader(train_ds, batch_size=batch_size,
                                  shuffle=True,  num_workers=0, pin_memory=False)
        val_loader   = DataLoader(val_ds,   batch_size=batch_size,
                                  shuffle=False, num_workers=0, pin_memory=False)

        # ── Model ─────────────────────────────────────────────
        weights_path = WEIGHTS_DIR / "best_model.pth"
        if weights_path.exists():
            logger.info("Loading existing checkpoint for fine-tuning…")
            model = SegFormerRoad.load_from_checkpoint(str(weights_path), map_location=str(device))
        else:
            model = SegFormerRoad(pretrained=True)
        model = model.to(device)

        criterion = CombinedLoss(dice_weight=0.5)
        optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=10, T_mult=2)

        WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
        best_iou = 0.0
        history  = {k: [] for k in ["train_loss","val_loss","train_iou","val_iou","train_acc","val_acc"]}

        _broadcast_sync({
            "event":       "training_started",
            "device":      str(device),
            "train_tiles": len(train_ds),
            "val_tiles":   len(val_ds),
            "max_epochs":  max_epochs,
        })

        for epoch in range(1, max_epochs + 1):
            if _stop_event.is_set():
                logger.info("Training stopped by user request.")
                with _lock:
                    _state["status"] = "stopped"
                _broadcast_sync({"event": "training_stopped", "epoch": epoch - 1})
                return

            t0 = time.time()

            # ── Train ─────────────────────────────────────────
            model.train()
            tl, ti, ta, nb = 0.0, 0.0, 0.0, 0
            for imgs, masks in train_loader:
                imgs, masks = imgs.to(device), masks.to(device)
                optimizer.zero_grad()
                logits = model(imgs)
                loss   = criterion(logits, masks)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                tl += loss.item()
                ti += calculate_iou(logits.detach(), masks)
                ta += calculate_accuracy(logits.detach(), masks)
                nb += 1

            train_loss = tl / max(nb, 1)
            train_iou  = ti / max(nb, 1)
            train_acc  = ta / max(nb, 1)

            # ── Validate ──────────────────────────────────────
            model.eval()
            vl, vi, va, nb = 0.0, 0.0, 0.0, 0
            with torch.no_grad():
                for imgs, masks in val_loader:
                    imgs, masks = imgs.to(device), masks.to(device)
                    logits = model(imgs)
                    loss   = criterion(logits, masks)
                    vl += loss.item()
                    vi += calculate_iou(logits, masks)
                    va += calculate_accuracy(logits, masks)
                    nb += 1

            val_loss = vl / max(nb, 1)
            val_iou  = vi / max(nb, 1)
            val_acc  = va / max(nb, 1)

            scheduler.step(epoch)
            elapsed = time.time() - t0

            # Record
            for key, val in [("train_loss", train_loss), ("val_loss", val_loss),
                              ("train_iou",  train_iou),  ("val_iou",  val_iou),
                              ("train_acc",  train_acc),  ("val_acc",  val_acc)]:
                history[key].append(round(val, 6))

            # Save best
            is_best = val_iou > best_iou
            if is_best:
                best_iou = val_iou
                torch.save(model.state_dict(), str(WEIGHTS_DIR / "best_model.pth"))

            # Update shared state
            with _lock:
                _state["epoch"]     = epoch
                _state["best_iou"]  = round(best_iou, 6)
                _state["best_acc"]  = round(max(_state["best_acc"], val_acc), 6)
                _state["best_epoch"] = epoch if is_best else _state["best_epoch"]
                _state["history"]   = {k: list(v) for k, v in history.items()}

            # Save history JSON
            with open(str(HISTORY_PATH), "w") as f:
                json.dump(history, f, indent=2)

            # Broadcast epoch result
            _broadcast_sync({
                "event":      "training_update",
                "epoch":      epoch,
                "max_epochs": max_epochs,
                "train_loss": round(train_loss, 6),
                "val_loss":   round(val_loss,   6),
                "train_iou":  round(train_iou,  6),
                "val_iou":    round(val_iou,    6),
                "train_acc":  round(train_acc,  6),
                "val_acc":    round(val_acc,    6),
                "best_iou":   round(best_iou,   6),
                "is_best":    is_best,
                "elapsed_s":  round(elapsed, 1),
                "lr":         round(optimizer.param_groups[0]["lr"], 8),
            })

            logger.info(
                f"Epoch {epoch}/{max_epochs} | "
                f"Train Loss:{train_loss:.4f} IoU:{train_iou:.4f} Acc:{train_acc:.4f} | "
                f"Val Loss:{val_loss:.4f} IoU:{val_iou:.4f} Acc:{val_acc:.4f} | "
                f"{'🏆 NEW BEST ' if is_best else ''}{elapsed:.1f}s"
            )

        # Done
        with _lock:
            _state["status"]      = "done"
            _state["finished_at"] = time.time()

        _broadcast_sync({
            "event":      "training_done",
            "best_iou":   round(best_iou, 6),
            "best_epoch": _state["best_epoch"],
            "epochs_run": max_epochs,
        })
        logger.success(f"Training complete — Best Val IoU: {best_iou:.4f}")

    except Exception as exc:
        logger.error(f"Training thread error: {exc}")
        with _lock:
            _state["status"] = "error"
            _state["error"]  = str(exc)
        _broadcast_sync({"event": "training_error", "detail": str(exc)})


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/start")
async def start_training(
    max_epochs: int = 5,
    batch_size: int = 2,
    lr: float       = 6e-5,
):
    """
    Launch SegFormer training in a background thread.
    Streams epoch metrics via WebSocket event `training_update`.
    """
    global _loop

    with _lock:
        if _state["status"] == "running":
            raise HTTPException(status_code=409, detail="Training is already running.")

        _stop_event.clear()
        job_id = str(uuid.uuid4())[:8]
        _state.update({
            "status":      "running",
            "job_id":      job_id,
            "epoch":       0,
            "max_epochs":  max_epochs,
            "best_iou":    0.0,
            "best_acc":    0.0,
            "best_epoch":  0,
            "started_at":  time.time(),
            "finished_at": None,
            "error":       None,
            "history": {k: [] for k in ["train_loss","val_loss","train_iou","val_iou","train_acc","val_acc"]},
        })

    # Capture the running event loop so the thread can schedule broadcasts
    _loop = asyncio.get_event_loop()

    thread = threading.Thread(
        target=_run_training,
        args=(max_epochs, batch_size, lr),
        daemon=True,
        name="training-worker",
    )
    thread.start()

    return {
        "status":     "started",
        "job_id":     job_id,
        "max_epochs": max_epochs,
        "batch_size": batch_size,
        "lr":         lr,
        "dataset": {
            "train_tiles": 24,
            "val_tiles":   6,
            "tile_size":   512,
            "source":      "Coimbatore Sentinel-2 + OSM road masks",
        },
    }


@router.post("/stop")
async def stop_training():
    """Signal the training thread to stop after the current epoch."""
    with _lock:
        if _state["status"] != "running":
            raise HTTPException(status_code=409, detail="No training is running.")
    _stop_event.set()
    return {"status": "stop_requested"}


@router.get("/status")
async def get_status():
    """Return current training state."""
    with _lock:
        return dict(_state)


@router.get("/history")
async def get_history():
    """Return epoch-by-epoch training history (loss, IoU, accuracy)."""
    # First try live state
    with _lock:
        h = _state["history"]
        if any(h.values()):
            return {"epochs": len(h["train_loss"]), "history": h}

    # Fall back to saved JSON
    if HISTORY_PATH.exists():
        with open(str(HISTORY_PATH)) as f:
            h = json.load(f)
        return {"epochs": len(h.get("train_loss", [])), "history": h}

    return {"epochs": 0, "history": {}}


@router.get("/accuracy")
async def evaluate_accuracy():
    """
    Run a full evaluation pass on the val set using the current best_model.pth.
    Returns pixel-accuracy, IoU, F1, precision, recall.
    No training — inference only.
    """
    weights_path = WEIGHTS_DIR / "best_model.pth"
    if not weights_path.exists():
        raise HTTPException(status_code=404, detail="No trained weights found at ai/weights/best_model.pth")

    val_img  = DATASET_DIR / "val" / "images"
    val_mask = DATASET_DIR / "val" / "masks"
    if not val_img.exists():
        raise HTTPException(status_code=404, detail="Val dataset not found. Run prepare_dataset.py first.")

    try:
        import sys
        sys.path.insert(0, str(PROJECT_ROOT))

        import torch
        import numpy as np
        from torch.utils.data import DataLoader
        from ai.models.segformer_road        import SegFormerRoad, CombinedLoss
        from ai.augmentation.augment_config  import get_val_transforms
        from ai.training.train_local         import RoadSegmentationDataset

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model  = SegFormerRoad.load_from_checkpoint(str(weights_path), map_location=str(device))
        model  = model.to(device)
        model.eval()

        val_ds     = RoadSegmentationDataset(str(val_img), str(val_mask),
                                             transform=get_val_transforms(512))
        val_loader = DataLoader(val_ds, batch_size=1, shuffle=False, num_workers=0)

        criterion = CombinedLoss(dice_weight=0.5)

        total_loss = tp = fp = fn = tn = 0.0
        n = 0

        with torch.no_grad():
            for imgs, masks in val_loader:
                imgs, masks = imgs.to(device), masks.to(device)
                logits = model(imgs)
                total_loss += criterion(logits, masks).item()

                preds  = (torch.sigmoid(logits) > 0.5).float()
                masks_b = masks.bool()
                preds_b = preds.bool()

                tp += (preds_b &  masks_b).sum().item()
                fp += (preds_b & ~masks_b).sum().item()
                fn += (~preds_b & masks_b).sum().item()
                tn += (~preds_b & ~masks_b).sum().item()
                n  += 1

        eps        = 1e-7
        precision  = tp / (tp + fp + eps)
        recall     = tp / (tp + fn + eps)
        f1         = 2 * precision * recall / (precision + recall + eps)
        iou        = tp / (tp + fp + fn + eps)
        accuracy   = (tp + tn) / (tp + fp + fn + tn + eps)
        avg_loss   = total_loss / max(n, 1)

        result = {
            "model":      "SegFormer-B2",
            "weights":    str(weights_path.name),
            "val_tiles":  n,
            "device":     str(device),
            "metrics": {
                "pixel_accuracy": round(accuracy * 100, 2),
                "iou":            round(iou * 100,      2),
                "f1_score":       round(f1 * 100,       2),
                "precision":      round(precision * 100, 2),
                "recall":         round(recall * 100,    2),
                "val_loss":       round(avg_loss, 6),
            },
            "confusion": {
                "true_positive":  int(tp),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_negative":  int(tn),
            },
        }

        await ws_manager.broadcast({"event": "accuracy_evaluated", **result})
        return result

    except Exception as exc:
        logger.error(f"Accuracy evaluation failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
