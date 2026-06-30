# Route Resilience AI 🛰️🛣️

> **AI-Powered Occlusion-Robust Road Intelligence & Emergency Navigation System**  
> Focused on **Coimbatore, Tamil Nadu, India**

---

## What This System Does

1. **Fetches** real-time satellite imagery of Coimbatore via Google Earth Engine (Sentinel-2, 10m resolution)
2. **Extracts** roads from imagery using a SegFormer model trained to work even under cloud/shadow occlusion
3. **Builds** a routable road graph (NetworkX + PostGIS)
4. **Routes** emergency vehicles through Dijkstra / A* / Yen's K-Shortest Paths
5. **Simulates** flood/disaster scenarios (remove blocked roads → find alternate routes)
6. **Identifies** the top-20 most critical road segments (betweenness centrality)
7. **Visualises** everything on an interactive MapLibre GL dashboard
8. **Answers** natural language queries via a LangGraph AI agent

---

## Target Area — Coimbatore

| Property | Value |
|---|---|
| City | Coimbatore, Tamil Nadu |
| Center | 11.0168°N, 76.9558°E |
| Default Radius | 15 km |
| Bounding Box | `[76.85, 10.90, 77.10, 11.15]` |
| Satellite | Sentinel-2 SR (10m, via GEE) |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/route-resilience-ai.git
cd route-resilience-ai

python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac

pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env — set your GEE service account path / OAuth
```

### 3. Authenticate Google Earth Engine

```bash
# One-time OAuth (local dev):
earthengine authenticate

# OR service account:
# Set GEE_SERVICE_ACCOUNT_EMAIL + GEE_SERVICE_ACCOUNT_KEY_PATH in .env
```

### 4. Run the Backend

```bash
python backend/main.py
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 5. Run the Frontend

```bash
cd frontend
npm install
npm run dev
# Dashboard at http://localhost:5173
```

---

## Project Structure

```
route-resilience-ai/
├── backend/                  # FastAPI backend
│   ├── api/routes/           # REST endpoints
│   ├── gee/                  # Google Earth Engine integration
│   ├── services/             # Business logic layer
│   ├── database/             # SQLAlchemy models (SQLite dev)
│   ├── websocket/            # WebSocket real-time manager
│   ├── agent/                # LangGraph AI agent
│   └── main.py
│
├── ai/                       # AI pipeline
│   ├── datasets/             # SpaceNet download scripts
│   ├── preprocessing/        # GeoTIFF → chips
│   ├── augmentation/         # Albumentations config
│   ├── models/               # SegFormer architecture
│   ├── training/             # Colab training notebook ⭐
│   ├── inference/            # Sliding-window predictor
│   └── weights/              # Model checkpoints (gitignored)
│
├── graph_engine/             # Road graph utilities
│   ├── skeletonize.py
│   ├── graph_builder.py
│   ├── routing.py
│   └── centrality.py
│
├── frontend/                 # React + TypeScript + MapLibre GL
│   └── src/
│       ├── components/
│       ├── store/
│       └── api/
│
└── docs/
```

---

## AI Training (Google Colab)

Open `ai/training/RoadSegmentation_Colab.ipynb` in Google Colab:

1. Mount Google Drive
2. Install dependencies (auto)
3. Download SpaceNet Road dataset from AWS S3
4. Run preprocessing pipeline
5. Train SegFormer-B2 model
6. Save weights to `/content/drive/MyDrive/reroute-ai/weights/`

Then copy weights to `ai/weights/best_model.pth` locally for inference.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/satellite` | Fetch Coimbatore satellite image |
| POST | `/api/roads/extract` | Run SegFormer inference |
| POST | `/api/graph/build` | Build road graph |
| GET | `/api/graph/critical` | Top-N critical roads |
| POST | `/api/route` | Find optimal route |
| POST | `/api/disaster/simulate` | Simulate flood scenario |
| GET | `/api/stats` | System statistics |
| WS | `/ws/updates` | Real-time updates |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + MapLibre GL |
| Backend | FastAPI + SQLAlchemy |
| AI Model | PyTorch + SegFormer (HuggingFace) |
| GIS | Google Earth Engine + Rasterio + GDAL |
| Graph | NetworkX + scikit-image |
| AI Agent | LangGraph |
| Training | Google Colab + SpaceNet Dataset |

---

## License

MIT — open for research and hackathon use.
