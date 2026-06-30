"""
SpaceNet Road Dataset Download Script
Downloads SpaceNet-2 Road Detection tiles from AWS S3.
Requires: AWS CLI configured with credentials.
"""

import os
import subprocess
import sys
from pathlib import Path

from loguru import logger

# SpaceNet Road Detection v2 — cities and their S3 prefixes
SPACENET_CITIES = {
    "Vegas": "AOI_2_Vegas",
    "Paris": "AOI_3_Paris",
    "Shanghai": "AOI_4_Shanghai",
    "Khartoum": "AOI_5_Khartoum",
}

S3_BUCKET = "s3://spacenet-dataset"
ROADS_PREFIX = "spacenet/SN3_roads/train"
LOCAL_DIR = Path("ai/datasets/raw")


def check_aws_credentials() -> bool:
    """Verify AWS credentials are configured."""
    result = subprocess.run(
        ["aws", "sts", "get-caller-identity"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        logger.error(
            "AWS credentials not configured. Run `aws configure` first.\n"
            f"Error: {result.stderr}"
        )
        return False
    logger.success("AWS credentials verified ✓")
    return True


def download_city(
    city_name: str,
    aoi_prefix: str,
    dry_run: bool = False,
    max_files: int | None = None,
) -> bool:
    """Download a single city's SpaceNet road data."""
    s3_path = f"{S3_BUCKET}/{ROADS_PREFIX}/{aoi_prefix}/"
    local_path = LOCAL_DIR / aoi_prefix

    local_path.mkdir(parents=True, exist_ok=True)

    logger.info(f"Downloading {city_name} from {s3_path}")

    cmd = [
        "aws", "s3", "sync",
        s3_path, str(local_path),
        "--request-payer", "requester",
        "--no-progress",
    ]
    if dry_run:
        cmd.append("--dryrun")

    result = subprocess.run(cmd, capture_output=False, text=True)
    if result.returncode != 0:
        logger.error(f"Failed to download {city_name}")
        return False

    logger.success(f"{city_name} downloaded to {local_path}")
    return True


def download_spacenet(
    cities: list[str] | None = None,
    dry_run: bool = False,
) -> None:
    """
    Main download entrypoint.
    By default downloads all 4 SpaceNet Road cities.
    """
    if not check_aws_credentials():
        sys.exit(1)

    selected = cities or list(SPACENET_CITIES.keys())
    logger.info(f"Downloading SpaceNet Road data for: {selected}")
    logger.info(
        "⚠️  Note: SpaceNet is requester-pays (~$0.09/GB). "
        "Vegas alone is ~12GB. All 4 cities ~50GB."
    )

    for city in selected:
        if city not in SPACENET_CITIES:
            logger.warning(f"Unknown city: {city}. Valid: {list(SPACENET_CITIES.keys())}")
            continue
        download_city(city, SPACENET_CITIES[city], dry_run=dry_run)

    logger.success("SpaceNet download complete.")
    logger.info(
        "Next step: run `python ai/preprocessing/chip_generator.py` "
        "to prepare training chips."
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Download SpaceNet Road Detection Dataset")
    parser.add_argument(
        "--cities", nargs="+",
        choices=list(SPACENET_CITIES.keys()),
        default=None,
        help="Cities to download (default: all)"
    )
    parser.add_argument("--dry-run", action="store_true", help="List files without downloading")
    args = parser.parse_args()

    download_spacenet(cities=args.cities, dry_run=args.dry_run)
