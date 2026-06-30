import { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { findRoute } from '../api/client';

export function RoutePanel() {
  const {
    activeRoute,
    selectedAlgorithm,
    isLoading,
    setActiveRoute,
    setAlgorithm,
    setLoading,
    addAlert,
    userLocation,
  } = useMapStore();

  // Coimbatore landmark coords defaults
  const [startLat, setStartLat] = useState('11.0168'); // Coimbatore Junction
  const [startLon, setStartLon] = useState('76.9558');
  const [endLat, setEndLat] = useState('11.0250');   // Gandhipuram
  const [endLon, setEndLon] = useState('76.9700');
  const [isEmergency, setIsEmergency] = useState(true);

  const handleFindRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true, 'Computing optimal route...');
    try {
      const res = await findRoute({
        start_lat: parseFloat(startLat),
        start_lon: parseFloat(startLon),
        end_lat: parseFloat(endLat),
        end_lon: parseFloat(endLon),
        algorithm: selectedAlgorithm,
        is_emergency: isEmergency,
      });
      setActiveRoute(res);
      addAlert(
        'route_computed',
        `Route calculated successfully: ${(res.distance_m / 1000).toFixed(2)} km using ${selectedAlgorithm.toUpperCase()}`,
        'info'
      );
    } catch (err: any) {
      console.error(err);
      addAlert(
        'route_error',
        `Failed to calculate route: ${err.response?.data?.detail || err.message}`,
        'critical'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <span className="card-icon">🛣️</span>
        Emergency Navigation
      </div>
      <form onSubmit={handleFindRoute} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label>Start Coords (Lat, Lon)</label>
          <div className="input-row">
            <input
              type="text"
              value={startLat}
              onChange={(e) => setStartLat(e.target.value)}
              placeholder="Lat"
              required
            />
            <input
              type="text"
              value={startLon}
              onChange={(e) => setStartLon(e.target.value)}
              placeholder="Lon"
              required
            />
          </div>
          <button 
            type="button" 
            className="btn btn-ghost btn-sm mt-2" 
            onClick={() => {
              if (userLocation) {
                setStartLat(userLocation.lat.toFixed(6));
                setStartLon(userLocation.lon.toFixed(6));
                addAlert('location_used', 'Start coordinates updated to your location.', 'info');
              } else {
                addAlert('location_error', 'Location not available. Please enable GPS on the map.', 'warning');
              }
            }}
          >
            📍 Use My Location
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label>Destination Coords (Lat, Lon)</label>
          <div className="input-row">
            <input
              type="text"
              value={endLat}
              onChange={(e) => setEndLat(e.target.value)}
              placeholder="Lat"
              required
            />
            <input
              type="text"
              value={endLon}
              onChange={(e) => setEndLon(e.target.value)}
              placeholder="Lon"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label>Routing Algorithm</label>
          <select
            value={selectedAlgorithm}
            onChange={(e) => setAlgorithm(e.target.value as any)}
          >
            <option value="astar">A* Search (Recommended)</option>
            <option value="dijkstra">Dijkstra's Algorithm</option>
            <option value="yens">Yen's K-Shortest Paths</option>
          </select>
        </div>

        <div className="flex items-center gap-2 mb-2" style={{ userSelect: 'none' }}>
          <input
            type="checkbox"
            id="emergency-chk"
            checked={isEmergency}
            onChange={(e) => setIsEmergency(e.target.checked)}
            style={{ width: 'auto', marginRight: '4px' }}
          />
          <label htmlFor="emergency-chk" style={{ display: 'inline', margin: 0, cursor: 'pointer' }}>
            Prioritize Disaster Bypass (Emergency Vehicle)
          </label>
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
          {isLoading ? 'Calculating...' : 'Find Resilient Route'}
        </button>
      </form>

      {activeRoute && (
        <div className="route-result mt-2">
          <div className="route-metric">
            <span className="route-metric-label">Distance:</span>
            <span className="route-metric-value">
              {(activeRoute.distance_m / 1000).toFixed(2)} km
            </span>
          </div>
          <div className="route-metric">
            <span className="route-metric-label">Est. Time:</span>
            <span className="route-metric-value">
              {Math.round(activeRoute.duration_estimate_s / 60)} min
            </span>
          </div>
          <div className="route-metric">
            <span className="route-metric-label">Algorithm:</span>
            <span className="route-metric-value" style={{ textTransform: 'uppercase' }}>
              {activeRoute.algorithm}
            </span>
          </div>
          <button
            onClick={() => setActiveRoute(null)}
            className="btn btn-ghost btn-sm btn-full mt-2"
          >
            Clear Route
          </button>
        </div>
      )}
    </div>
  );
}
