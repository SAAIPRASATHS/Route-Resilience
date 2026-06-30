import { create } from 'zustand';

export interface RouteResult {
  route_id: number;
  algorithm: string;
  distance_m: number;
  duration_estimate_s: number;
  route_geojson: GeoJSON.LineString;
  alternate_routes: GeoJSON.LineString[];
  is_emergency: boolean;
}

export interface CriticalRoad {
  segment_id: number;
  centrality_score: number;
  length_m: number | null;
  geometry: GeoJSON.LineString;
}

export interface DisasterEvent {
  disaster_id: number;
  disaster_type: string;
  severity: string;
  name: string;
  blocked_segments: number;
  geometry: GeoJSON.Polygon;
  alternate_route: GeoJSON.LineString | null;
}

export interface Stats {
  city: string;
  center: { lat: number; lon: number };
  counts: {
    satellite_images: number;
    predictions: number;
    road_segments: number;
    blocked_segments: number;
    critical_segments: number;
    routes_computed: number;
    active_disasters: number;
  };
  network_health: {
    blocked_pct: number;
    status: 'operational' | 'critical';
  };
}

interface WsAlert {
  id: string;
  event: string;
  message: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
}

interface MapStore {
  // Map view
  center: [number, number];       // [lon, lat]
  zoom: number;
  mapStyle: 'satellite' | 'street';

  // Data layers
  satelliteImageUrl: string | null;
  roadGeoJSON: GeoJSON.FeatureCollection | null;
  criticalRoads: CriticalRoad[];
  activeRoute: RouteResult | null;
  activeDisasters: DisasterEvent[];

  // Stats
  stats: Stats | null;

  // UI state
  selectedAlgorithm: 'dijkstra' | 'astar' | 'yens';
  isLoading: boolean;
  loadingMessage: string;

  // WebSocket alerts
  alerts: WsAlert[];

  // Actions
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setMapStyle: (style: 'satellite' | 'street') => void;
  setSatelliteImageUrl: (url: string | null) => void;
  setRoadGeoJSON: (geojson: GeoJSON.FeatureCollection | null) => void;
  setCriticalRoads: (roads: CriticalRoad[]) => void;
  setActiveRoute: (route: RouteResult | null) => void;
  addDisaster: (d: DisasterEvent) => void;
  clearDisaster: (id: number) => void;
  setStats: (stats: Stats) => void;
  setAlgorithm: (algo: 'dijkstra' | 'astar' | 'yens') => void;
  setLoading: (loading: boolean, message?: string) => void;
  addAlert: (event: string, message: string, severity?: WsAlert['severity']) => void;
  dismissAlert: (id: string) => void;

  // Training state
  trainingState: {
    status: 'idle' | 'running' | 'done' | 'error' | 'stopped';
    job_id: string | null;
    epoch: number;
    max_epochs: number;
    best_iou: number;
    best_acc: number;
    best_epoch: number;
    started_at: number | null;
    finished_at: number | null;
    error: string | null;
    history: {
      train_loss: number[];
      val_loss: number[];
      train_iou: number[];
      val_iou: number[];
      train_acc: number[];
      val_acc: number[];
    };
    device?: string;
    train_tiles?: number;
    val_tiles?: number;
    evaluationResult?: any;
  };
  setTrainingState: (state: any) => void;
  updateTrainingHistory: (history: any) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  // Coimbatore centre
  center: [76.9558, 11.0168],
  zoom: 12,
  mapStyle: 'satellite',

  satelliteImageUrl: null,
  roadGeoJSON: null,
  criticalRoads: [],
  activeRoute: null,
  activeDisasters: [],
  stats: null,
  selectedAlgorithm: 'astar',
  isLoading: false,
  loadingMessage: '',
  alerts: [],

  trainingState: {
    status: 'idle',
    job_id: null,
    epoch: 0,
    max_epochs: 0,
    best_iou: 0,
    best_acc: 0,
    best_epoch: 0,
    started_at: null,
    finished_at: null,
    error: null,
    history: {
      train_loss: [],
      val_loss: [],
      train_iou: [],
      val_iou: [],
      train_acc: [],
      val_acc: [],
    },
  },

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setMapStyle: (mapStyle) => set({ mapStyle }),
  setSatelliteImageUrl: (satelliteImageUrl) => set({ satelliteImageUrl }),
  setRoadGeoJSON: (roadGeoJSON) => set({ roadGeoJSON }),
  setCriticalRoads: (criticalRoads) => set({ criticalRoads }),
  setActiveRoute: (activeRoute) => set({ activeRoute }),
  addDisaster: (d) => set((s) => ({ activeDisasters: [...s.activeDisasters, d] })),
  clearDisaster: (id) =>
    set((s) => ({ activeDisasters: s.activeDisasters.filter((x) => x.disaster_id !== id) })),
  setStats: (stats) => set({ stats }),
  setAlgorithm: (selectedAlgorithm) => set({ selectedAlgorithm }),
  setLoading: (isLoading, loadingMessage = '') => set({ isLoading, loadingMessage }),
  addAlert: (event, message, severity = 'info') =>
    set((s) => ({
      alerts: [
        { id: `${Date.now()}`, event, message, timestamp: new Date(), severity },
        ...s.alerts.slice(0, 19),
      ],
    })),
  dismissAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
  setTrainingState: (state) =>
    set((s) => ({ trainingState: { ...s.trainingState, ...state } })),
  updateTrainingHistory: (history) =>
    set((s) => ({ trainingState: { ...s.trainingState, history } })),
}));
