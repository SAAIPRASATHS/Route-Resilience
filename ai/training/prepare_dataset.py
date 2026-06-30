"""
Dataset Preparation for Coimbatore Road Segmentation
=====================================================
Reads a Sentinel-2 TIFF, tiles it into 512×512 patches,
downloads OSM road data, and rasterizes binary road masks.

Usage:
    python -m ai.training.prepare_dataset
"""

import os
import sys
import json
import numpy as np
from pathlib import Path
from PIL import Image

import rasterio
from rasterio.transform import from_bounds
from rasterio.features import rasterize
from shapely.geometry import box as shapely_box

# ── Configuration ──────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parents[2]  # e:\Reroute
TIFF_PATH = PROJECT_ROOT / "20230118T051139_20230118T052404_T43PFN.tif"
DATASET_DIR = PROJECT_ROOT / "ai" / "datasets" / "coimbatore"

TILE_SIZE = 512       # pixels
OVERLAP = 0.5         # 50% overlap to maximize training data
MIN_ROAD_PCT = 0.5    # minimum road coverage % to keep a tile
TRAIN_SPLIT = 0.8     # 80% train, 20% val
ROAD_BUFFER_M = 3     # base buffer width in meters


def read_sentinel2_rgb(tiff_path: str) -> tuple:
    """
    Read Sentinel-2 TIFF and extract RGB (B4, B3, B2).
    Returns (rgb_array [H, W, 3] uint8, bounds, crs).
    """
    print(f"📡 Reading TIFF: {tiff_path}")
    with rasterio.open(tiff_path) as src:
        descriptions = src.descriptions
        print(f"   Bands: {descriptions}")
        print(f"   Size:  {src.width}×{src.height}")
        print(f"   CRS:   {src.crs}")
        print(f"   Bounds: {src.bounds}")

        # Read all bands
        data = src.read()  # [bands, H, W]
        bounds = src.bounds
        crs = src.crs

        # Find RGB band indices (B4=Red, B3=Green, B2=Blue)
        band_map = {desc: i for i, desc in enumerate(descriptions)}
        r_idx = band_map.get("B4", 0)
        g_idx = band_map.get("B3", 1)
        b_idx = band_map.get("B2", 2)

        rgb = np.stack([data[r_idx], data[g_idx], data[b_idx]], axis=-1)  # [H, W, 3]

        # Normalize uint16 → uint8 using percentile clipping
        for c in range(3):
            channel = rgb[:, :, c].astype(np.float32)
            p2 = np.percentile(channel[channel > 0], 2) if (channel > 0).any() else 0
            p98 = np.percentile(channel[channel > 0], 98) if (channel > 0).any() else 1
            channel = np.clip((channel - p2) / (p98 - p2 + 1e-6) * 255, 0, 255)
            rgb[:, :, c] = channel.astype(np.uint8)

        rgb = rgb.astype(np.uint8)
        print(f"   ✅ RGB extracted and normalized to uint8: {rgb.shape}")

    return rgb, bounds, crs


def tile_image(rgb: np.ndarray, bounds, tile_size: int, overlap: float) -> list:
    """
    Tile a large image into patches with geographic coordinates.
    Returns list of (tile_array, tile_bbox, tile_id).
    """
    h, w = rgb.shape[:2]
    step = int(tile_size * (1.0 - overlap))

    west, south, east, north = bounds
    px_width = (east - west) / w    # degrees per pixel
    px_height = (north - south) / h

    tiles = []
    tile_idx = 0

    for y in range(0, h - tile_size + 1, step):
        for x in range(0, w - tile_size + 1, step):
            tile = rgb[y:y + tile_size, x:x + tile_size]

            # Skip tiles with too many black (nodata) pixels
            black_pct = np.mean(np.all(tile == 0, axis=-1)) * 100
            if black_pct > 30:
                continue

            # Calculate geographic bbox for this tile
            tile_west = west + x * px_width
            tile_east = west + (x + tile_size) * px_width
            tile_north = north - y * px_height
            tile_south = north - (y + tile_size) * px_height
            bbox = [tile_west, tile_south, tile_east, tile_north]

            tile_id = f"coimbatore_{tile_idx:04d}"
            tiles.append((tile, bbox, tile_id))
            tile_idx += 1

    print(f"   ✅ Generated {len(tiles)} tiles ({tile_size}×{tile_size}, {overlap*100:.0f}% overlap)")
    return tiles


def download_osm_roads(bounds):
    """
    Download road network from OpenStreetMap for the given bounds.
    Returns GeoDataFrame of road edges.
    """
    import osmnx as ox

    west, south, east, north = bounds
    print(f"🗺️  Downloading OSM roads for area:")
    print(f"   {west:.4f}°E – {east:.4f}°E, {south:.4f}°N – {north:.4f}°N")

    # Add small buffer to ensure coverage
    buf = 0.005
    try:
        G = ox.graph_from_bbox(
            bbox=(west - buf, south - buf, east + buf, north + buf),
            network_type="drive",
        )
        edges = ox.graph_to_gdfs(G, nodes=False)
        print(f"   ✅ Downloaded {len(edges)} road segments")
        return edges
    except Exception as e:
        print(f"   ⚠️ graph_from_bbox failed: {e}")
        print("   Trying graph_from_point fallback...")
        center_lat = (south + north) / 2
        center_lon = (west + east) / 2
        G = ox.graph_from_point(
            (center_lat, center_lon),
            dist=15000,
            network_type="drive",
        )
        edges = ox.graph_to_gdfs(G, nodes=False)
        print(f"   ✅ Downloaded {len(edges)} road segments")
        return edges


def create_road_mask(edges_gdf, bbox, image_size=512, buffer_m=3) -> np.ndarray:
    """
    Create a binary road mask from OSM road vectors.
    Buffers road lines by road type for realistic width.
    """
    west, south, east, north = bbox
    tile_box = shapely_box(west, south, east, north)

    # Clip roads to tile extent
    clipped = edges_gdf[edges_gdf.intersects(tile_box)].copy()

    if len(clipped) == 0:
        return np.zeros((image_size, image_size), dtype=np.uint8)

    # Buffer roads (1° ≈ 111km at equator)
    buffer_deg = buffer_m / 111000.0

    geometries = []
    for _, row in clipped.iterrows():
        highway = row.get("highway", "residential")
        if isinstance(highway, list):
            highway = highway[0]

        # Wider roads get bigger buffers
        if highway in ("motorway", "trunk", "primary"):
            buf = buffer_deg * 3
        elif highway in ("secondary", "tertiary"):
            buf = buffer_deg * 2
        else:
            buf = buffer_deg

        buffered = row.geometry.buffer(buf)
        clipped_geom = buffered.intersection(tile_box)
        if not clipped_geom.is_empty:
            geometries.append(clipped_geom)

    if len(geometries) == 0:
        return np.zeros((image_size, image_size), dtype=np.uint8)

    # Rasterize
    transform = from_bounds(west, south, east, north, image_size, image_size)
    mask = rasterize(
        [(geom, 1) for geom in geometries],
        out_shape=(image_size, image_size),
        transform=transform,
        fill=0,
        dtype=np.uint8,
    )

    return mask


def main():
    print("=" * 60)
    print("  🛰️  Coimbatore Road Segmentation — Dataset Preparation")
    print("=" * 60)

    # ── Step 1: Read Sentinel-2 TIFF ─────────────────────────────
    if not TIFF_PATH.exists():
        print(f"❌ TIFF not found: {TIFF_PATH}")
        sys.exit(1)

    rgb, bounds, crs = read_sentinel2_rgb(str(TIFF_PATH))

    # ── Step 2: Tile into patches ────────────────────────────────
    print(f"\n🔲 Tiling image into {TILE_SIZE}×{TILE_SIZE} patches...")
    tiles = tile_image(rgb, bounds, TILE_SIZE, OVERLAP)

    if len(tiles) == 0:
        print("❌ No valid tiles generated!")
        sys.exit(1)

    # ── Step 3: Download OSM roads ───────────────────────────────
    print(f"\n🌐 Downloading road network from OpenStreetMap...")
    edges = download_osm_roads(bounds)

    # ── Step 4: Create masks and save ────────────────────────────
    images_dir = DATASET_DIR / "images"
    masks_dir = DATASET_DIR / "masks"
    images_dir.mkdir(parents=True, exist_ok=True)
    masks_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n🏗️  Creating road masks for {len(tiles)} tiles...")
    valid_tiles = []

    for tile_img, bbox, tile_id in tiles:
        mask = create_road_mask(edges, bbox, TILE_SIZE, ROAD_BUFFER_M)

        road_pct = mask.sum() / mask.size * 100
        if road_pct < MIN_ROAD_PCT:
            continue

        # Save image
        img_path = images_dir / f"{tile_id}.png"
        Image.fromarray(tile_img).save(str(img_path))

        # Save mask (0/255 for visibility)
        mask_path = masks_dir / f"{tile_id}.png"
        Image.fromarray(mask * 255).save(str(mask_path))

        valid_tiles.append({
            "id": tile_id,
            "bbox": bbox,
            "road_pct": round(road_pct, 2),
        })

    print(f"   ✅ Saved {len(valid_tiles)} tiles with road coverage > {MIN_ROAD_PCT}%")

    # ── Step 5: Train/Val split ──────────────────────────────────
    print(f"\n📊 Splitting dataset...")
    np.random.seed(42)
    indices = np.random.permutation(len(valid_tiles))
    n_train = int(TRAIN_SPLIT * len(valid_tiles))

    train_dir = DATASET_DIR / "train"
    val_dir = DATASET_DIR / "val"
    for subdir in ["images", "masks"]:
        (train_dir / subdir).mkdir(parents=True, exist_ok=True)
        (val_dir / subdir).mkdir(parents=True, exist_ok=True)

    import shutil
    train_ids, val_ids = [], []

    for i, idx in enumerate(indices):
        tile = valid_tiles[idx]
        src_img = images_dir / f"{tile['id']}.png"
        src_mask = masks_dir / f"{tile['id']}.png"

        if i < n_train:
            split_dir = train_dir
            train_ids.append(tile["id"])
        else:
            split_dir = val_dir
            val_ids.append(tile["id"])

        shutil.copy2(str(src_img), str(split_dir / "images" / f"{tile['id']}.png"))
        shutil.copy2(str(src_mask), str(split_dir / "masks" / f"{tile['id']}.png"))

    print(f"   Train: {len(train_ids)} tiles")
    print(f"   Val:   {len(val_ids)} tiles")

    # Save metadata
    metadata = {
        "source_tiff": str(TIFF_PATH.name),
        "tile_size": TILE_SIZE,
        "overlap": OVERLAP,
        "total_tiles": len(valid_tiles),
        "train_tiles": len(train_ids),
        "val_tiles": len(val_ids),
        "tiles": valid_tiles,
    }
    with open(str(DATASET_DIR / "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n{'='*60}")
    print(f"  ✅ Dataset ready at: {DATASET_DIR}")
    print(f"     Train: {len(train_ids)} | Val: {len(val_ids)}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
