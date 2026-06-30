import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
});

// ── Satellite ────────────────────────────────────────────────────────────────
export const fetchSatelliteImage = (params?: {
  lat?: number;
  lon?: number;
  radius_km?: number;
  start_date?: string;
  end_date?: string;
}) => api.get('/api/satellite', { params }).then((r) => r.data);

export const exportToDrive = (params?: {
  start_date?: string;
  end_date?: string;
  drive_folder?: string;
}) => api.post('/api/satellite/export', null, { params }).then((r) => r.data);

// ── Roads ────────────────────────────────────────────────────────────────────
export const extractRoads = (formData: FormData | { image_id: number }) => {
  if (formData instanceof FormData) {
    return api.post('/api/roads/extract', formData).then((r) => r.data);
  }
  return api
    .post('/api/roads/extract', null, { params: formData })
    .then((r) => r.data);
};

// ── Graph ────────────────────────────────────────────────────────────────────
export const buildGraph = (prediction_id: number) =>
  api.post('/api/graph/build', null, { params: { prediction_id } }).then((r) => r.data);

export const getCriticalRoads = (top_n = 20, prediction_id?: number) =>
  api
    .get('/api/graph/critical', { params: { top_n, prediction_id } })
    .then((r) => r.data);

export const getCriticalNodes = (top_n = 20) =>
  api.get('/api/graph/nodes/critical', { params: { top_n } }).then((r) => r.data);

// ── Route ─────────────────────────────────────────────────────────────────────
export const findRoute = (body: {
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  algorithm?: 'dijkstra' | 'astar' | 'yens';
  k_paths?: number;
  is_emergency?: boolean;
  prediction_id?: number;
}) => api.post('/api/route', body).then((r) => r.data);

// ── Disaster ─────────────────────────────────────────────────────────────────
export const simulateDisaster = (body: {
  name: string;
  disaster_type: string;
  severity: string;
  geometry: GeoJSON.Polygon;
  alt_route_start?: [number, number];
  alt_route_end?: [number, number];
}) => api.post('/api/disaster/simulate', body).then((r) => r.data);

export const clearDisaster = (disaster_id: number) =>
  api.delete(`/api/disaster/${disaster_id}/clear`).then((r) => r.data);

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = () => api.get('/api/stats').then((r) => r.data);

// ── Training ──────────────────────────────────────────────────────────────────
export const startTraining = (params?: { max_epochs?: number; batch_size?: number; lr?: number }) =>
  api.post('/api/training/start', null, { params }).then((r) => r.data);

export const stopTraining = () =>
  api.post('/api/training/stop').then((r) => r.data);

export const getTrainingStatus = () =>
  api.get('/api/training/status').then((r) => r.data);

export const getTrainingHistory = () =>
  api.get('/api/training/history').then((r) => r.data);

export const evaluateAccuracy = () =>
  api.get('/api/training/accuracy').then((r) => r.data);
