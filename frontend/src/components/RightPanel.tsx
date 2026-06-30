import { useMapStore } from '../store/mapStore';

export function RightPanel() {
  const { stats, userLocation } = useMapStore();

  return (
    <aside className="right-panel">
      {/* Weather */}
      <div className="right-panel-card">
        <div className="right-panel-card-title">Current Weather</div>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 28 }}>⛅</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>32°C</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Partly Cloudy · Coimbatore</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Humidity: 68% · Wind: 12 km/h</div>
        </div>
      </div>

      {/* System Info */}
      <div className="right-panel-card">
        <div className="right-panel-card-title">System Status</div>
        <div className="right-panel-item">
          <span className="right-panel-item-label">Satellite Update</span>
          <span className="right-panel-item-value">Live</span>
        </div>
        <div className="right-panel-item">
          <span className="right-panel-item-label">AI Model</span>
          <span className="right-panel-item-value" style={{ color: 'var(--success)' }}>SegFormer-B2</span>
        </div>
        <div className="right-panel-item">
          <span className="right-panel-item-label">Model Accuracy</span>
          <span className="right-panel-item-value">83.0%</span>
        </div>
        <div className="right-panel-item">
          <span className="right-panel-item-label">Network Health</span>
          <span className="right-panel-item-value" style={{
            color: stats?.network_health?.status === 'critical' ? 'var(--danger)' : 'var(--success)'
          }}>
            {stats ? `${100 - stats.network_health.blocked_pct}%` : '—'}
          </span>
        </div>
      </div>

      {/* GPS Status */}
      <div className="right-panel-card">
        <div className="right-panel-card-title">GPS Tracking</div>
        {userLocation ? (
          <>
            <div className="right-panel-item">
              <span className="right-panel-item-label">Latitude</span>
              <span className="right-panel-item-value">{userLocation.lat.toFixed(5)}°</span>
            </div>
            <div className="right-panel-item">
              <span className="right-panel-item-label">Longitude</span>
              <span className="right-panel-item-value">{userLocation.lon.toFixed(5)}°</span>
            </div>
            <div className="right-panel-item">
              <span className="right-panel-item-label">Accuracy</span>
              <span className="right-panel-item-value">{userLocation.accuracy.toFixed(0)}m</span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
            Click the GPS button on the map to enable tracking
          </div>
        )}
      </div>

      {/* Network Counts */}
      {stats && (
        <div className="right-panel-card">
          <div className="right-panel-card-title">Infrastructure</div>
          <div className="right-panel-item">
            <span className="right-panel-item-label">Road Segments</span>
            <span className="right-panel-item-value">{stats.counts.road_segments}</span>
          </div>
          <div className="right-panel-item">
            <span className="right-panel-item-label">Routes Computed</span>
            <span className="right-panel-item-value">{stats.counts.routes_computed}</span>
          </div>
          <div className="right-panel-item">
            <span className="right-panel-item-label">Predictions</span>
            <span className="right-panel-item-value">{stats.counts.predictions}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
