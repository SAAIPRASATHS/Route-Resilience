import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapStore } from '../store/mapStore';

// Fix Leaflet default icon paths
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Coimbatore center
const COIMBATORE = { lat: 11.0168, lng: 76.9558 };

// Tile sources
const TILES = {
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  street:    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

interface Layer {
  id: string;
  label: string;
  color: string;
  enabled: boolean;
}

const INITIAL_LAYERS: Layer[] = [
  { id: 'satellite', label: 'Satellite',    color: '#3B82F6', enabled: true },
  { id: 'roads',     label: 'Roads',        color: '#475569', enabled: true },
  { id: 'ai_roads',  label: 'AI Roads',     color: '#2563EB', enabled: false },
  { id: 'flood',     label: 'Flood Zones',  color: '#3B82F6', enabled: true },
  { id: 'hospitals', label: 'Hospitals',    color: '#22C55E', enabled: true },
  { id: 'police',    label: 'Police',       color: '#1E3A8A', enabled: false },
  { id: 'fire',      label: 'Fire Stations',color: '#EF4444', enabled: false },
  { id: 'shelters',  label: 'Shelters',     color: '#F59E0B', enabled: false },
  { id: 'vehicles',  label: 'Live Vehicles',color: '#22C55E', enabled: true },
];

type MapStyle = 'satellite' | 'street' | 'dark';

interface MapCanvasProps {
  showLayers: boolean;
  setShowLayers: (v: boolean) => void;
}

export function MapCanvas({ showLayers, setShowLayers }: MapCanvasProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const layersRef = useRef<{
    roads?: L.GeoJSON;
    criticalRoads?: L.GeoJSON;
    activeRoute?: L.GeoJSON;
    disasters?: L.GeoJSON;
  }>({});

  const [mapStyle, setMapStyleState] = useState<MapStyle>('satellite');
  const [layers, setLayers] = useState<Layer[]>(INITIAL_LAYERS);
  const [coords, setCoords] = useState(`${COIMBATORE.lat.toFixed(4)}°N, ${COIMBATORE.lng.toFixed(4)}°E`);
  const [zoomLevel, setZoomLevel] = useState(12);

  const { center, zoom, roadGeoJSON, criticalRoads, activeRoute, activeDisasters, setCenter, setZoom } = useMapStore();

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = L.map(mapContainer.current, {
      center: [COIMBATORE.lat, COIMBATORE.lng],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    // Add zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Tile layer
    const tile = L.tileLayer(TILES.satellite, {
      maxZoom: 19,
      attribution: '© Esri · © OpenStreetMap contributors',
    }).addTo(map);

    tileRef.current = tile;

    // Center marker
    const centerIcon = L.divIcon({
      className: '',
      html: `<div style="
        width: 12px; height: 12px;
        background: #2563EB; border: 2px solid white;
        border-radius: 50%; box-shadow: 0 0 0 3px rgba(37,99,235,0.3);
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    L.marker([COIMBATORE.lat, COIMBATORE.lng], { icon: centerIcon })
      .bindPopup('<b>Coimbatore Command Center</b><br>Route Resilience AI — EOC')
      .addTo(map);

    // Mock hospital markers
    const hospitals = [
      { lat: 11.0196, lng: 76.9674, name: 'Coimbatore Medical College Hospital' },
      { lat: 11.0275, lng: 76.9533, name: 'KMCH — Kovai Medical Center' },
      { lat: 11.0089, lng: 76.9627, name: 'PSG Hospitals' },
    ];

    hospitals.forEach(h => {
      const hospitalIcon = L.divIcon({
        className: '',
        html: `<div style="
          width: 22px; height: 22px;
          background: #22C55E; border: 2px solid white;
          border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; color: white; font-weight: 700;
        ">H</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      L.marker([h.lat, h.lng], { icon: hospitalIcon })
        .bindPopup(`<b>🏥 ${h.name}</b>`)
        .addTo(map);
    });

    // Mock flood zone
    const floodPolygon = L.polygon(
      [[11.0050, 76.9500], [11.0050, 76.9620], [11.0120, 76.9650], [11.0140, 76.9490]],
      { color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.18, weight: 1.5, dashArray: '5,4' }
    ).bindPopup('<b>⚠️ Flood Zone — Ukkadam Lake</b><br>Severity: High · Water depth ~1.2m').addTo(map);

    // Mock vehicle positions (live vehicles)
    const vehicles = [
      { lat: 11.0230, lng: 76.9700, label: 'AMB-7', color: '#EF4444' },
      { lat: 11.0150, lng: 76.9580, label: 'ENG-3', color: '#F59E0B' },
      { lat: 11.0080, lng: 76.9720, label: 'PCR-9', color: '#1E3A8A' },
    ];

    vehicles.forEach(v => {
      const vIcon = L.divIcon({
        className: '',
        html: `<div style="
          background: ${v.color}; color: white;
          padding: 2px 5px; border-radius: 4px;
          font-size: 9px; font-weight: 800;
          border: 1.5px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          white-space: nowrap;
          font-family: 'IBM Plex Mono', monospace;
        ">${v.label}</div>`,
        iconSize: [36, 18],
        iconAnchor: [18, 9],
      });
      L.marker([v.lat, v.lng], { icon: vIcon }).addTo(map);
    });

    map.on('move', () => {
      const c = map.getCenter();
      setCenter([c.lng, c.lat]);
      setCoords(`${c.lat.toFixed(4)}°N, ${c.lng.toFixed(4)}°E`);
    });

    map.on('zoom', () => {
      const z = Math.round(map.getZoom() * 10) / 10;
      setZoom(z);
      setZoomLevel(z);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch tile style
  const switchStyle = (style: MapStyle) => {
    setMapStyleState(style);
    if (tileRef.current) {
      tileRef.current.setUrl(TILES[style]);
    }
  };

  // Road network layer
  useEffect(() => {
    if (!mapRef.current) return;
    if (layersRef.current.roads) mapRef.current.removeLayer(layersRef.current.roads);
    if (roadGeoJSON) {
      layersRef.current.roads = L.geoJSON(roadGeoJSON as GeoJSON.FeatureCollection, {
        style: { color: '#2563EB', weight: 2, opacity: 0.7 }
      }).addTo(mapRef.current);
    }
  }, [roadGeoJSON]);

  // Critical roads
  useEffect(() => {
    if (!mapRef.current) return;
    if (layersRef.current.criticalRoads) mapRef.current.removeLayer(layersRef.current.criticalRoads);
    if (criticalRoads.length > 0) {
      const fc: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: criticalRoads.map(r => ({
          type: 'Feature' as const,
          geometry: r.geometry as GeoJSON.Geometry,
          properties: { score: r.centrality_score, id: r.segment_id },
        })),
      };
      layersRef.current.criticalRoads = L.geoJSON(fc, {
        style: { color: '#F59E0B', weight: 4, opacity: 0.9 }
      }).addTo(mapRef.current);
    }
  }, [criticalRoads]);

  // Active route
  useEffect(() => {
    if (!mapRef.current) return;
    if (layersRef.current.activeRoute) mapRef.current.removeLayer(layersRef.current.activeRoute);
    if (activeRoute) {
      layersRef.current.activeRoute = L.geoJSON(activeRoute.route_geojson as GeoJSON.Geometry, {
        style: { color: '#22C55E', weight: 5, dashArray: '6, 4', opacity: 0.95 }
      }).addTo(mapRef.current);
    }
  }, [activeRoute]);

  // Disasters
  useEffect(() => {
    if (!mapRef.current) return;
    if (layersRef.current.disasters) mapRef.current.removeLayer(layersRef.current.disasters);
    if (activeDisasters.length > 0) {
      const fc: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: activeDisasters.map(d => ({
          type: 'Feature' as const,
          geometry: d.geometry as GeoJSON.Geometry,
          properties: { name: d.name, type: d.disaster_type, severity: d.severity },
        })),
      };
      layersRef.current.disasters = L.geoJSON(fc, {
        style: { fillColor: '#EF4444', color: '#EF4444', weight: 2, fillOpacity: 0.2 }
      }).addTo(mapRef.current);
    }
  }, [activeDisasters]);

  const toggleLayer = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l));
  };

  const handleLocate = () => {
    if (!mapRef.current) return;
    navigator.geolocation?.getCurrentPosition(pos => {
      mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { animate: true, duration: 1.2 });
    });
  };

  const handleZoomIn  = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleFit     = () => mapRef.current?.flyTo([COIMBATORE.lat, COIMBATORE.lng], 12, { animate: true, duration: 1 });

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Map container */}
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

      {/* ── Map Style Toggle (top center) ──────────────────── */}
      <div className="map-style-btn-group">
        {(['satellite', 'street', 'dark'] as MapStyle[]).map(s => (
          <button
            key={s}
            className={`map-style-btn${mapStyle === s ? ' active' : ''}`}
            onClick={() => switchStyle(s)}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              {s === 'satellite' ? 'satellite_alt' : s === 'dark' ? 'dark_mode' : 'map'}
            </span>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Layer Control Panel (top-left, below route planner) ─ */}
      {showLayers && (
        <div className="map-layers-panel" style={{ top: 12, left: 12 }}>
          <div className="layers-title">Map Layers</div>
          {layers.map(layer => (
            <div key={layer.id} className="layer-toggle">
              <button
                className={`layer-switch${layer.enabled ? ' on' : ''}`}
                onClick={() => toggleLayer(layer.id)}
                id={`layer-${layer.id}`}
                aria-label={`Toggle ${layer.label}`}
              />
              <span className="layer-dot" style={{ background: layer.color }} />
              <span className="layer-name">{layer.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Map Toolbar (left, vertical) ────────────────────── */}
      <div className="map-toolbar">
        <button className="map-toolbar-btn" onClick={handleZoomIn} title="Zoom in">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>add</span>
        </button>
        <button className="map-toolbar-btn" onClick={handleZoomOut} title="Zoom out">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>remove</span>
        </button>
        <div className="map-toolbar-divider" />
        <button
          id="btn-layers"
          className={`map-toolbar-btn${showLayers ? '' : ''}`}
          onClick={() => setShowLayers(!showLayers)}
          title="Toggle layer panel"
          style={showLayers ? { borderColor: 'var(--blue-accent)', color: 'var(--navy)' } : {}}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>layers</span>
        </button>
        <button className="map-toolbar-btn" onClick={handleLocate} title="Locate me">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>my_location</span>
        </button>
        <div className="map-toolbar-divider" />
        <button className="map-toolbar-btn" title="Draw polygon">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>draw</span>
        </button>
        <button className="map-toolbar-btn" title="Measure distance">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>straighten</span>
        </button>
        <button className="map-toolbar-btn" onClick={handleFit} title="Reset view">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>fit_screen</span>
        </button>
        <div className="map-toolbar-divider" />
        <button className="map-toolbar-btn" title="Fullscreen">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>fullscreen</span>
        </button>
      </div>

      {/* ── Coordinate Bar (bottom center) ─────────────────── */}
      <div className="coord-bar">
        📍 {coords} &nbsp;|&nbsp; z{zoomLevel} &nbsp;|&nbsp; WGS84
      </div>
    </div>
  );
}
