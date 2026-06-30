"""
ORM Models — Route Resilience AI
Database tables matching the schema design.
All geometry stored as JSON strings in SQLite; upgrade to PostGIS GEOMETRY for production.
"""

import json
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer,
    String, Text, JSON, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.db import Base


# ─── Helpers ────────────────────────────────────────────────────────────────

def now_utc() -> datetime:
    return datetime.utcnow()


# ─── Models ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    routes: Mapped[list["Route"]] = relationship(back_populates="user")


class SatelliteImage(Base):
    __tablename__ = "satellite_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    city: Mapped[str] = mapped_column(String(100), default="Coimbatore")
    # bbox stored as JSON "[xmin, ymin, xmax, ymax]"
    bbox: Mapped[str] = mapped_column(Text, nullable=False)
    acquired_start: Mapped[str] = mapped_column(String(20))
    acquired_end: Mapped[str] = mapped_column(String(20))
    gee_asset_id: Mapped[str | None] = mapped_column(String(512))
    storage_path: Mapped[str | None] = mapped_column(String(512))
    cloud_cover_pct: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    predictions: Mapped[list["Prediction"]] = relationship(back_populates="image")

    @property
    def bbox_list(self) -> list[float]:
        return json.loads(self.bbox)


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    image_id: Mapped[int] = mapped_column(ForeignKey("satellite_images.id"))
    model_version: Mapped[str] = mapped_column(String(50), default="segformer-b2-v1")
    mask_path: Mapped[str | None] = mapped_column(String(512))
    # GeoJSON of the road mask
    mask_geojson: Mapped[str | None] = mapped_column(Text)
    iou_score: Mapped[float | None] = mapped_column(Float)
    f1_score: Mapped[float | None] = mapped_column(Float)
    inference_time_ms: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    image: Mapped[SatelliteImage] = relationship(back_populates="predictions")
    road_segments: Mapped[list["RoadSegment"]] = relationship(back_populates="prediction")


class RoadSegment(Base):
    """
    Individual road segment extracted from the road graph.
    geometry stored as GeoJSON LineString string.
    """
    __tablename__ = "road_segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    prediction_id: Mapped[int | None] = mapped_column(ForeignKey("predictions.id"))
    # GeoJSON LineString {"type": "LineString", "coordinates": [[lon, lat], ...]}
    geometry: Mapped[str] = mapped_column(Text, nullable=False)
    length_m: Mapped[float | None] = mapped_column(Float)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    is_critical: Mapped[bool] = mapped_column(Boolean, default=False)
    centrality_score: Mapped[float | None] = mapped_column(Float)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    road_class: Mapped[str | None] = mapped_column(String(50))  # primary/secondary/...
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    prediction: Mapped[Prediction | None] = relationship(back_populates="road_segments")


class CriticalNode(Base):
    """High-importance intersection nodes (articulation points / high betweenness)."""
    __tablename__ = "critical_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    node_id: Mapped[str] = mapped_column(String(100), unique=True)  # "lat_lon"
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    betweenness: Mapped[float | None] = mapped_column(Float)
    closeness: Mapped[float | None] = mapped_column(Float)
    is_articulation_point: Mapped[bool] = mapped_column(Boolean, default=False)
    connected_segment_ids: Mapped[str | None] = mapped_column(Text)  # JSON list
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)


class Disaster(Base):
    """Disaster / flood event that blocks road segments."""
    __tablename__ = "disasters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    disaster_type: Mapped[str] = mapped_column(String(50))  # flood, landslide, fire
    # GeoJSON Polygon of the affected area
    geometry: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="moderate")  # low/moderate/high
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    blocked_segment_ids: Mapped[str | None] = mapped_column(Text)  # JSON list
    start_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    end_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)


class Route(Base):
    """Computed routes for emergency navigation."""
    __tablename__ = "routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    # Start / end as "lat,lon" strings
    start_point: Mapped[str] = mapped_column(String(50))
    end_point: Mapped[str] = mapped_column(String(50))
    algorithm: Mapped[str] = mapped_column(String(30), default="astar")  # dijkstra/astar/yens
    # GeoJSON LineString of full route
    route_geometry: Mapped[str | None] = mapped_column(Text)
    distance_m: Mapped[float | None] = mapped_column(Float)
    duration_estimate_s: Mapped[float | None] = mapped_column(Float)
    segment_ids: Mapped[str | None] = mapped_column(Text)  # JSON list
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    user: Mapped[User | None] = relationship(back_populates="routes")


class EventLog(Base):
    """Audit log for all system events (satellite fetches, model runs, disasters)."""
    __tablename__ = "event_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    # free-form JSON payload
    payload: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(20), default="info")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, index=True)
