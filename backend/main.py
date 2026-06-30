"""
Route Resilience AI — FastAPI Application Entry Point
Focused on Coimbatore, Tamil Nadu, India.
"""

import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from backend.config import settings
from backend.database.db import init_db
from backend.gee.auth import initialize_gee
from backend.websocket.manager import ws_manager

# ─── API Routers ─────────────────────────────────────────────────────────────
from backend.api.routes.satellite import router as satellite_router
from backend.api.routes.roads import router as roads_router
from backend.api.routes.graph import router as graph_router
from backend.api.routes.route import router as route_router
from backend.api.routes.disaster import router as disaster_router
from backend.api.routes.stats import router as stats_router
from backend.api.routes.training import router as training_router


# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info(f"🚀 Starting {settings.app_name} — {settings.default_city}")

    # Init database (create tables)
    await init_db()
    logger.success("Database initialised ✓")

    # Init GEE
    gee_ok = initialize_gee()
    if not gee_ok:
        logger.warning(
            "GEE authentication failed — satellite endpoints will be unavailable. "
            "Run `earthengine authenticate` and restart."
        )
    else:
        logger.success("Google Earth Engine ready ✓")

    logger.info(
        f"📡 AOI: {settings.default_city} | "
        f"[{settings.default_bbox_xmin}, {settings.default_bbox_ymin}, "
        f"{settings.default_bbox_xmax}, {settings.default_bbox_ymax}]"
    )

    yield  # Application runs here

    logger.info("🛑 Shutting down Route Resilience AI")


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Route Resilience AI",
    description=(
        "AI-Powered Occlusion-Robust Road Intelligence & Emergency Navigation System\n\n"
        f"**Target City**: {settings.default_city}, Tamil Nadu, India\n"
        "**Satellite**: Sentinel-2 SR via Google Earth Engine\n"
        "**Model**: SegFormer-B2 trained on SpaceNet Road Detection Dataset\n"
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ──────────────────────────────────────────────────────────────────

app.include_router(satellite_router)
app.include_router(roads_router)
app.include_router(graph_router)
app.include_router(route_router)
app.include_router(disaster_router)
app.include_router(stats_router)
app.include_router(training_router)


@app.get("/", tags=["health"])
async def root():
    return {
        "status": "online",
        "service": settings.app_name,
        "city": settings.default_city,
        "center": {"lat": settings.default_lat, "lon": settings.default_lon},
        "docs": "/docs",
        "websocket": "/ws/updates",
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "env": settings.app_env}


# ─── WebSocket ───────────────────────────────────────────────────────────────

@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    """
    Real-time update channel.
    Clients receive JSON events for:
      - disaster_alert: new disaster detected / simulated
      - disaster_cleared: disaster resolved
      - satellite_update: new imagery available
      - graph_update: road graph rebuilt
      - route_computed: new route ready
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; server pushes events proactively
            data = await websocket.receive_text()
            # Echo ping/pong
            if data == "ping":
                await ws_manager.send_to(websocket, {"event": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.is_dev,
        log_level="info" if not settings.debug else "debug",
    )
