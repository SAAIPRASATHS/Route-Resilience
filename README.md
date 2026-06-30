# Route Resilience AI

## AI-Powered Occlusion-Robust Road Intelligence & Emergency Routing System

Route Resilience AI is an end-to-end intelligent geospatial platform that transforms satellite imagery into actionable road intelligence for disaster response and urban mobility. The system combines Deep Learning, Remote Sensing, Graph Theory, GIS, and AI Agents to generate resilient routes, identify critical infrastructure, and support emergency decision-making.

---

## Problem Statement

Conventional navigation systems depend on historical maps, GPS traces, and user-reported incidents. During disasters such as floods, landslides, cyclones, and earthquakes, these systems become unreliable because they cannot accurately determine the current state of road infrastructure.

Satellite imagery provides the latest view of the affected region, but extracting continuous road networks is challenging due to:

- Tree canopy occlusions
- Building shadows
- Cloud cover
- Smoke and haze
- Broken road connectivity

These limitations delay emergency response and reduce the effectiveness of rescue operations during the critical "Golden Hour."

---

## Proposed Solution

Route Resilience AI provides an end-to-end intelligent pipeline that:

1. Retrieves recent satellite imagery using Google Earth Engine.
2. Extracts roads using an occlusion-aware SegFormer model.
3. Reconstructs hidden road connectivity.
4. Converts road masks into a connected graph.
5. Detects critical roads and bottlenecks.
6. Simulates disaster scenarios.
7. Computes resilient emergency routes.
8. Provides an interactive decision support dashboard.

---

## Key Features

### AI-Based Road Extraction

- Occlusion-aware SegFormer-B2 architecture
- Robust road detection under trees, clouds, and shadows
- High-resolution semantic segmentation

### Intelligent Graph Generation

- Road skeletonization
- Automatic node and edge generation
- Connected road network construction

### Graph Analytics

- Betweenness Centrality
- Closeness Centrality
- Connected Components
- Critical Road Identification
- Bottleneck Detection
- Infrastructure Resilience Analysis

### Disaster Simulation

- Flood Simulation
- Landslide Simulation
- Road Closure Analysis
- Bridge Failure Simulation
- Dynamic Route Recalculation

### Emergency Routing

- Ambulance Navigation
- Fire Service Routing
- Police Response Routing
- Alternate Route Recommendation

### Decision Support

- Critical Infrastructure Monitoring
- Real-time Risk Assessment
- Emergency Route Recommendation
- Interactive Urban Intelligence Dashboard

---

## System Architecture

```text
Google Earth Engine
        │
        ▼
Satellite Imagery
        │
        ▼
Preprocessing
        │
        ▼
SegFormer Road Extraction
        │
        ▼
Road Mask Generation
        │
        ▼
Skeletonization
        │
        ▼
Graph Construction
(NetworkX)
        │
        ▼
Criticality Analysis
        │
        ▼
Disaster Simulation
        │
        ▼
Route Optimization
(A*, Dijkstra)
        │
        ▼
FastAPI Backend
        │
        ▼
React Dashboard
```

---

## Technology Stack

| Layer | Technologies |
|--------|--------------|
| AI & Machine Learning | PyTorch, SegFormer-B2 |
| Backend | FastAPI, Python |
| Frontend | React, TypeScript, Vite |
| GIS | Google Earth Engine, Rasterio, GeoJSON |
| Graph Analytics | NetworkX |
| Database | PostgreSQL, PostGIS |
| Maps | MapLibre GL |
| Real-Time Communication | WebSockets |
| AI Agent | LangGraph |

---

## Workflow

```text
Satellite Imagery
        │
        ▼
Road Extraction
        │
        ▼
Road Graph Generation
        │
        ▼
Criticality Analysis
        │
        ▼
Disaster Simulation
        │
        ▼
Emergency Route Planning
        │
        ▼
Interactive Dashboard
```

---

## Project Structure

```text
Route-Resilience-AI
│
├── ai
│   ├── datasets
│   ├── preprocessing
│   ├── augmentation
│   ├── models
│   ├── training
│   ├── inference
│   └── weights
│
├── backend
│   ├── api
│   ├── graph
│   ├── agent
│   ├── websocket
│   ├── services
│   └── database
│
├── frontend
│
├── graph_engine
│
├── docs
│
├── docker
│
└── README.md
```

---

## Innovation

- Occlusion-Robust Road Extraction
- AI-Based Road Connectivity Recovery
- Graph-Theoretic Criticality Analysis
- Disaster-Aware Dynamic Routing
- Infrastructure Resilience Scoring
- AI-Powered Decision Support
- End-to-End Automated Geospatial Intelligence Pipeline

---

## Future Enhancements

- Drone Image Integration
- Live Traffic Intelligence
- IoT Sensor Integration
- Predictive Road Failure Detection
- AI Traffic Forecasting
- Multi-Agent Emergency Coordination
- Smart City Integration

---

## Expected Outcomes

- High-accuracy road extraction
- Connected road network generation
- Identification of critical infrastructure
- Disaster-aware route optimization
- Faster emergency response
- Interactive decision support system

---

## Installation

### Clone Repository

```bash
git clone https://github.com/SAAIPRASATHS/Route-Resilience.git
cd Route-Resilience
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Research References

- SpaceNet Road Dataset
- DeepGlobe Road Extraction Challenge
- Google Earth Engine Documentation
- SegFormer: Simple and Efficient Design for Semantic Segmentation
- NetworkX Documentation
- OpenStreetMap
- ISRO Bhuvan

---

## License

This project is released under the MIT License.

---

## Authors

Developed as part of the **Route Resilience AI** project for intelligent urban mobility, disaster resilience, and emergency response.
