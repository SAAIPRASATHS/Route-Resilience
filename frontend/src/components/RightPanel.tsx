import { useMapStore } from '../store/mapStore';

function Donut({ pct, color, label }: { pct: number; color: string; label: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="donut">
      <svg viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--border-color)" strokeWidth="5" />
        <circle
          cx="26" cy="26" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="donut-center">
        {pct}%
        <span className="donut-sub">{label}</span>
      </div>
    </div>
  );
}

function SignalBars({ strength }: { strength: number }) {
  // strength 1-4
  return (
    <div className="sat-signal">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={`signal-bar${i <= strength ? ' active' : ''}`}
          style={{ height: `${i * 3 + 3}px` }}
        />
      ))}
    </div>
  );
}

export function RightPanel() {
  const { stats } = useMapStore();
  const blockedPct = stats?.network_health?.blocked_pct ?? 12;
  const healthPct = 100 - blockedPct;

  return (
    <aside className="right-panel" role="complementary" aria-label="Information panel">

      {/* ── Current Weather ───────────────────────────────── */}
      <div className="rp-section">
        <div className="rp-title">
          <span className="material-symbols-outlined" style={{ color: 'var(--warning)', fontVariationSettings: "'FILL' 1" }}>
            wb_sunny
          </span>
          Current Weather
        </div>
        <div className="weather-card">
          <div className="weather-main">
            <div className="weather-icon-lg">⛅</div>
            <div className="weather-data">
              <div className="weather-deg">32°C</div>
              <div className="weather-cond">Partly Cloudy · Coimbatore, TN</div>
            </div>
          </div>
          <div className="weather-stats">
            <div className="weather-stat">
              <span className="weather-stat-label">Humidity</span>
              <span className="weather-stat-value">68%</span>
            </div>
            <div className="weather-stat">
              <span className="weather-stat-label">Wind</span>
              <span className="weather-stat-value">12 km/h</span>
            </div>
            <div className="weather-stat">
              <span className="weather-stat-label">Visibility</span>
              <span className="weather-stat-value">8.2 km</span>
            </div>
            <div className="weather-stat">
              <span className="weather-stat-label">Pressure</span>
              <span className="weather-stat-value">1013 hPa</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Satellite Status ──────────────────────────────── */}
      <div className="rp-section">
        <div className="rp-title">
          <span className="material-symbols-outlined" style={{ color: 'var(--blue-accent)', fontVariationSettings: "'FILL' 1" }}>
            satellite_alt
          </span>
          Satellite Status
        </div>

        <div className="sat-status-item">
          <span className="sat-orbit-icon">🛰️</span>
          <div className="sat-info">
            <div className="sat-name">Sentinel-2A</div>
            <div className="sat-detail">Last pass: 14:32 IST · Band-8 NIR</div>
          </div>
          <SignalBars strength={4} />
        </div>

        <div className="sat-status-item">
          <span className="sat-orbit-icon">🛸</span>
          <div className="sat-info">
            <div className="sat-name">RISAT-2BR1</div>
            <div className="sat-detail">Next pass: 19:15 IST · SAR</div>
          </div>
          <SignalBars strength={3} />
        </div>

        <div className="sat-status-item">
          <span className="sat-orbit-icon">📡</span>
          <div className="sat-info">
            <div className="sat-name">Cartosat-3</div>
            <div className="sat-detail">Acquiring: 0.25m resolution</div>
          </div>
          <SignalBars strength={2} />
        </div>
      </div>

      {/* ── Model Status ──────────────────────────────────── */}
      <div className="rp-section">
        <div className="rp-title">
          <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontVariationSettings: "'FILL' 1" }}>
            model_training
          </span>
          AI Model Status
        </div>
        <div className="status-row">
          <span className="status-row-label">Active Model</span>
          <span className="status-row-value blue">SegFormer-B2</span>
        </div>
        <div className="status-row">
          <span className="status-row-label">IoU Accuracy</span>
          <span className="status-row-value green">83.0%</span>
        </div>
        <div className="status-row">
          <span className="status-row-label">Last Inference</span>
          <span className="status-row-value">2 min ago</span>
        </div>
        <div className="status-row">
          <span className="status-row-label">Device</span>
          <span className="status-row-value">CUDA · GPU</span>
        </div>
        <div className="status-row">
          <span className="status-row-label">Status</span>
          <span className="status-row-value green">● Operational</span>
        </div>
      </div>

      {/* ── Road Statistics ───────────────────────────────── */}
      <div className="rp-section">
        <div className="rp-title">
          <span className="material-symbols-outlined" style={{ color: 'var(--navy)', fontVariationSettings: "'FILL' 1" }}>
            analytics
          </span>
          Road Statistics
        </div>
        <div className="donut-wrapper">
          <Donut pct={healthPct} color="var(--success)" label="Health" />
          <div className="donut-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--success)' }} />
              <span>{healthPct}% Operational</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--warning)' }} />
              <span>{Math.round(blockedPct * 0.6)}% Degraded</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: 'var(--danger)' }} />
              <span>{Math.round(blockedPct * 0.4)}% Blocked</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="status-row">
            <span className="status-row-label">Road Segments</span>
            <span className="status-row-value">{stats?.counts.road_segments ?? 4218}</span>
          </div>
          <div className="status-row">
            <span className="status-row-label">Critical Segments</span>
            <span className="status-row-value orange">{stats?.counts.critical_segments ?? 14}</span>
          </div>
          <div className="status-row">
            <span className="status-row-label">Routes Computed</span>
            <span className="status-row-value blue">{stats?.counts.routes_computed ?? 41}</span>
          </div>
        </div>
      </div>

      {/* ── Live Alerts ───────────────────────────────────── */}
      <div className="rp-section">
        <div className="rp-title">
          <span className="material-symbols-outlined" style={{ color: 'var(--danger)', fontVariationSettings: "'FILL' 1" }}>
            notifications_active
          </span>
          Live Alerts
        </div>

        <div className="alert-item-rp critical">
          <span className="alert-dot red" />
          <div>
            <div className="alert-text">Flood barrier breached — Ukkadam Lake sector</div>
            <div className="alert-time">3 min ago · Zone-4</div>
          </div>
        </div>

        <div className="alert-item-rp warning">
          <span className="alert-dot orange" />
          <div>
            <div className="alert-text">Bridge load limit exceeded — Avinashi Rd overpass</div>
            <div className="alert-time">11 min ago · NH-544</div>
          </div>
        </div>

        <div className="alert-item-rp info">
          <span className="alert-dot blue" />
          <div>
            <div className="alert-text">Ambulance Unit-7 rerouted via Race Course Rd</div>
            <div className="alert-time">18 min ago · ETA 6 min</div>
          </div>
        </div>
      </div>

      {/* ── Recent Incidents ──────────────────────────────── */}
      <div className="rp-section">
        <div className="rp-title">
          <span className="material-symbols-outlined" style={{ color: 'var(--warning)', fontVariationSettings: "'FILL' 1" }}>
            report
          </span>
          Recent Incidents
        </div>

        <div className="incident-item">
          <div className="incident-icon red">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>flood</span>
          </div>
          <div className="incident-body">
            <div className="incident-title">Flooding — Ukkadam Lake</div>
            <div className="incident-meta">Severity: Critical · 14:32 IST</div>
          </div>
        </div>

        <div className="incident-item">
          <div className="incident-icon orange">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          </div>
          <div className="incident-body">
            <div className="incident-title">Structure Fire — Ganapathy</div>
            <div className="incident-meta">Severity: High · 13:58 IST</div>
          </div>
        </div>

        <div className="incident-item">
          <div className="incident-icon blue">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>car_crash</span>
          </div>
          <div className="incident-body">
            <div className="incident-title">Multi-vehicle Accident — Trichy Rd</div>
            <div className="incident-meta">Severity: Medium · 13:12 IST</div>
          </div>
        </div>
      </div>

      {/* ── System Health ─────────────────────────────────── */}
      <div className="rp-section">
        <div className="rp-title">
          <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontVariationSettings: "'FILL' 1" }}>
            monitor_heart
          </span>
          System Health
        </div>

        <div className="health-bar-row">
          <div className="health-bar-header">
            <span className="health-bar-label">API Server</span>
            <span className="health-bar-pct">98%</span>
          </div>
          <div className="health-bar-track">
            <div className="health-bar-fill green" style={{ width: '98%' }} />
          </div>
        </div>

        <div className="health-bar-row">
          <div className="health-bar-header">
            <span className="health-bar-label">Graph Engine</span>
            <span className="health-bar-pct">91%</span>
          </div>
          <div className="health-bar-track">
            <div className="health-bar-fill green" style={{ width: '91%' }} />
          </div>
        </div>

        <div className="health-bar-row">
          <div className="health-bar-header">
            <span className="health-bar-label">AI Inference</span>
            <span className="health-bar-pct">86%</span>
          </div>
          <div className="health-bar-track">
            <div className="health-bar-fill green" style={{ width: '86%' }} />
          </div>
        </div>

        <div className="health-bar-row">
          <div className="health-bar-header">
            <span className="health-bar-label">WebSocket</span>
            <span className="health-bar-pct">100%</span>
          </div>
          <div className="health-bar-track">
            <div className="health-bar-fill green" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="health-bar-row">
          <div className="health-bar-header">
            <span className="health-bar-label">DB Storage</span>
            <span className="health-bar-pct">64%</span>
          </div>
          <div className="health-bar-track">
            <div className="health-bar-fill orange" style={{ width: '64%' }} />
          </div>
        </div>
      </div>

    </aside>
  );
}
