"""
Route Resilience AI — Application Configuration
Coimbatore, Tamil Nadu focused settings.
"""

from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────
    app_name: str = "Route Resilience AI"
    app_env: Literal["development", "production"] = "development"
    debug: bool = True
    secret_key: str = "change-me-in-production"

    # ── Server ───────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    frontend_origin: str = "http://localhost:5173"

    # ── Database ─────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./reroute.db"

    # ── Redis ────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    use_redis: bool = False

    # ── GEE ──────────────────────────────────────────────────
    gee_service_account_email: str = ""
    gee_service_account_key_path: str = "gee-service-account.json"
    gee_project_id: str = "gen-lang-client-0065697514"

    # ── Default AOI: Coimbatore ──────────────────────────────
    default_city: str = "Coimbatore"
    default_lat: float = 11.0168
    default_lon: float = 76.9558
    default_radius_km: float = 15.0

    # GEE bounding box [xmin, ymin, xmax, ymax] in EPSG:4326
    default_bbox_xmin: float = 76.85
    default_bbox_ymin: float = 10.90
    default_bbox_xmax: float = 77.10
    default_bbox_ymax: float = 11.15

    # ── Satellite / GEE ──────────────────────────────────────
    gee_collection: str = "COPERNICUS/S2_SR_HARMONIZED"
    gee_cloud_threshold: int = 20
    gee_default_start: str = "2024-01-01"
    gee_default_end: str = "2024-12-31"
    gee_scale_meters: int = 10

    # ── AI Model ─────────────────────────────────────────────
    model_weights_path: str = "ai/weights/best_model.pth"
    model_device: str = "cpu"
    inference_tile_size: int = 512
    inference_overlap: int = 64

    # ── AWS / SpaceNet ────────────────────────────────────────
    aws_default_region: str = "us-east-1"
    spacenet_s3_bucket: str = "spacenet-dataset"
    spacenet_local_dir: str = "ai/datasets/raw"

    @property
    def default_bbox(self) -> list[float]:
        """Returns [xmin, ymin, xmax, ymax] for Coimbatore."""
        return [
            self.default_bbox_xmin,
            self.default_bbox_ymin,
            self.default_bbox_xmax,
            self.default_bbox_ymax,
        ]

    @property
    def is_dev(self) -> bool:
        return self.app_env == "development"

    @property
    def cors_origins(self) -> list[str]:
        origins = [self.frontend_origin]
        if self.is_dev:
            origins += ["http://localhost:3000", "http://127.0.0.1:5173"]
        return origins


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton — call this everywhere."""
    return Settings()


# Convenience export
settings = get_settings()
