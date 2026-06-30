import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../store/mapStore';

// Coimbatore centre
const COIMBATORE = { lng: 76.9558, lat: 11.0168 };

// OSM Tile URL
const STREET_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
};

// ESRI World Imagery (satellite)
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: 'Tiles © Esri',
    },
  },
  layers: [{ id: 'esri-satellite', type: 'raster', source: 'esri' }],
};

export function MapCanvas() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const {
    center, zoom, mapStyle,
    roadGeoJSON, criticalRoads, activeRoute, activeDisasters,
    setCenter, setZoom, setMapStyle, setUserLocation
  } = useMapStore();

  // ── Init map ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle === 'satellite' ? SATELLITE_STYLE : STREET_STYLE,
      center: [COIMBATORE.lng, COIMBATORE.lat],
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true
    });
    map.addControl(geolocate, 'bottom-right');

    geolocate.on('geolocate', (e: GeolocationPosition) => {
      setUserLocation({
        lat: e.coords.latitude,
        lon: e.coords.longitude,
        accuracy: e.coords.accuracy,
        heading: e.coords.heading
      });
    });

    map.on('load', () => {
      setMapReady(true);

      // ── Road network layer ──────────────────────────────────
      map.addSource('roads', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'roads-layer',
        type: 'line',
        source: 'roads',
        paint: {
          'line-color': '#3b82f6',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 16, 3],
          'line-opacity': 0.8,
        },
      });

      // ── Critical roads layer ─────────────────────────────────
      map.addSource('critical-roads', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'critical-roads-layer',
        type: 'line',
        source: 'critical-roads',
        paint: {
          'line-color': '#f59e0b',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 4],
          'line-opacity': 0.9,
        },
      });

      // ── Active route layer ───────────────────────────────────
      map.addSource('active-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'active-route-layer',
        type: 'line',
        source: 'active-route',
        paint: {
          'line-color': '#10b981',
          'line-width': 4,
          'line-dasharray': [2, 1],
        },
      });

      // ── Disaster zone layer ──────────────────────────────────
      map.addSource('disasters', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'disasters-fill',
        type: 'fill',
        source: 'disasters',
        paint: {
          'fill-color': '#ef4444',
          'fill-opacity': 0.2,
        },
      });
      map.addLayer({
        id: 'disasters-outline',
        type: 'line',
        source: 'disasters',
        paint: {
          'line-color': '#ef4444',
          'line-width': 2,
        },
      });

      // Coimbatore marker
      new maplibregl.Marker({ color: '#3b82f6' })
        .setLngLat([COIMBATORE.lng, COIMBATORE.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setText(
            'Coimbatore, Tamil Nadu — Route Resilience AI'
          )
        )
        .addTo(map);
    });

    map.on('move', () => {
      const c = map.getCenter();
      setCenter([c.lng, c.lat]);
      setZoom(Math.round(map.getZoom() * 10) / 10);
    });

    mapRef.current = map;
    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Switch base style ────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    mapRef.current.setStyle(mapStyle === 'satellite' ? SATELLITE_STYLE : STREET_STYLE);
    // Wait for style to load before re-adding sources/layers
    mapRef.current.once('style.load', () => setMapReady((p) => !p || true));
  }, [mapStyle]);

  // ── Update road network ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const src = mapRef.current.getSource('roads') as maplibregl.GeoJSONSource | undefined;
    if (src && roadGeoJSON) src.setData(roadGeoJSON as GeoJSON.FeatureCollection);
  }, [roadGeoJSON, mapReady]);

  // ── Update critical roads ────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const src = mapRef.current.getSource('critical-roads') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData({
        type: 'FeatureCollection',
        features: criticalRoads.map((r) => ({
          type: 'Feature',
          geometry: r.geometry,
          properties: { score: r.centrality_score, id: r.segment_id },
        })),
      });
    }
  }, [criticalRoads, mapReady]);

  // ── Update active route ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const src = mapRef.current.getSource('active-route') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(
        activeRoute
          ? {
              type: 'FeatureCollection',
              features: [{ type: 'Feature', geometry: activeRoute.route_geojson, properties: {} }],
            }
          : { type: 'FeatureCollection', features: [] }
      );
    }
  }, [activeRoute, mapReady]);

  // ── Update disaster zones ─────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const src = mapRef.current.getSource('disasters') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData({
        type: 'FeatureCollection',
        features: activeDisasters.map((d) => ({
          type: 'Feature',
          geometry: d.geometry,
          properties: { name: d.name, type: d.disaster_type, severity: d.severity },
        })),
      });
    }
  }, [activeDisasters, mapReady]);

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Map style toggle */}
      <div className="map-controls">
        <button
          id="btn-satellite"
          className={`map-control-btn ${mapStyle === 'satellite' ? 'active' : ''}`}
          onClick={() => setMapStyle('satellite')}
          title="Satellite view"
        >
          🛰️
        </button>
        <button
          id="btn-street"
          className={`map-control-btn ${mapStyle === 'street' ? 'active' : ''}`}
          onClick={() => setMapStyle('street')}
          title="Street view"
        >
          🗺️
        </button>
      </div>

      {/* Coordinates display */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 16,
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 8px',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}
      >
        {center[1].toFixed(4)}°N, {center[0].toFixed(4)}°E | z{zoom}
      </div>
    </div>
  );
}
