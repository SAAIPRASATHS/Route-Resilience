import { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { simulateDisaster, clearDisaster } from '../api/client';

export function DisasterOverlay() {
  const { activeDisasters, isLoading, setLoading, addAlert } = useMapStore();
  const [disasterName, setDisasterName] = useState('Noyyal River Flooding');
  const [severity, setSeverity] = useState('moderate');
  const [disasterType, setDisasterType] = useState('flood');

  // Coordinates default to Coimbatore Noyyal basin area
  const [polyCoords, setPolyCoords] = useState(
    '[[[76.920, 10.970], [76.980, 10.970], [76.980, 10.990], [76.920, 10.990], [76.920, 10.970]]]'
  );

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true, 'Injecting disaster boundaries and recalculating graph weights...');

    try {
      const parsedCoords = JSON.parse(polyCoords);
      const res = await simulateDisaster({
        name: disasterName,
        disaster_type: disasterType,
        severity,
        geometry: {
          type: 'Polygon',
          coordinates: parsedCoords,
        },
      });

      addAlert(
        'disaster_alert',
        `Disaster Simulation Active: ${res.blocked_segments} road segments blocked.`,
        'critical'
      );
    } catch (err: any) {
      console.error(err);
      addAlert(
        'disaster_error',
        `Simulation failed: ${err.message || 'Check JSON coordinate format'}`,
        'critical'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async (id: number) => {
    setLoading(true, 'Clearing disaster zones and restoring traffic lanes...');
    try {
      await clearDisaster(id);
    } catch (err: any) {
      console.error(err);
      addAlert('clear_error', 'Failed to clear disaster event', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card disaster-panel">
      <div className="card-title text-danger">
        <span className="card-icon">⚠️</span>
        Disaster Simulation
      </div>

      <form onSubmit={handleSimulate} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label>Event Name</label>
          <input
            type="text"
            value={disasterName}
            onChange={(e) => setDisasterName(e.target.value)}
            required
          />
        </div>

        <div className="input-row">
          <div className="flex flex-col gap-2">
            <label>Disaster Type</label>
            <select value={disasterType} onChange={(e) => setDisasterType(e.target.value)}>
              <option value="flood">Flood</option>
              <option value="landslide">Landslide</option>
              <option value="fire">Wildfire</option>
              <option value="bridge_collapse">Bridge Collapse</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label>Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="low">Low Impact</option>
              <option value="moderate">Moderate</option>
              <option value="high">High (Severe)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label>Polygon Coordinates (GeoJSON format)</label>
          <textarea
            value={polyCoords}
            onChange={(e) => setPolyCoords(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '6px 10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              outline: 'none',
              resize: 'vertical',
            }}
            required
          />
        </div>

        <button type="submit" className="btn btn-danger btn-full" disabled={isLoading}>
          Trigger Sim Alert
        </button>
      </form>

      {activeDisasters.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="separator" />
          <div className="text-sm font-semibold text-danger mb-1">Active Events:</div>
          {activeDisasters.map((d) => (
            <div
              key={d.disaster_id}
              className="flex justify-between items-center p-2 rounded"
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold">{d.name}</span>
                <span className="text-xs text-muted">
                  {d.disaster_type.toUpperCase()} | {d.blocked_segments} blocked
                </span>
              </div>
              <button
                onClick={() => handleClear(d.disaster_id)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '2px 8px', fontSize: '10px' }}
              >
                Clear
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
