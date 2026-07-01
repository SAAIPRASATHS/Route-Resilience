import { useMapStore } from '../store/mapStore';

interface TopBarProps {
  sidebarCollapsed: boolean;
}

export function TopBar({ sidebarCollapsed }: TopBarProps) {
  const { stats } = useMapStore();
  const isOperational = stats?.network_health?.status !== 'critical';

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <header className="topbar">
      {/* Brand */}
      <div className={`topbar-brand${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="brand-logo">
          <div className="brand-icon">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              satellite_alt
            </span>
          </div>
          {!sidebarCollapsed && (
            <div className="brand-text">
              <div className="brand-name">Route Resilience AI</div>
              <div className="brand-sub">Emergency Operations Center</div>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="topbar-search">
        <div className="topbar-search-inner">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
            search
          </span>
          <input
            type="text"
            id="global-search"
            placeholder="Search locations, hospitals, emergency units, roads..."
            autoComplete="off"
          />
          <span className="search-kbd">⌘K</span>
        </div>
      </div>

      {/* Right cluster */}
      <div className="topbar-right">
        {/* Date/Time */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
          padding: '0 4px', borderRight: '1px solid var(--border-color)',
          paddingRight: 10, marginRight: 2
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-data)', color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {timeStr}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
            {dateStr} IST
          </span>
        </div>

        {/* Weather */}
        <div className="weather-chip" title="Current weather — Coimbatore">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            partly_cloudy_day
          </span>
          <span className="weather-temp">32°C</span>
          <span className="weather-desc">Partly Cloudy</span>
        </div>

        {/* System Status */}
        <div className={`status-chip ${isOperational ? 'operational' : 'critical'}`}>
          <span className="status-dot" />
          {isOperational ? 'System Operational' : 'Active Incidents'}
        </div>

        {/* Notifications */}
        <button className="icon-btn" id="btn-notifications" title="Notifications (3)">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>
            notifications
          </span>
          <span className="notif-badge">3</span>
        </button>

        {/* Settings */}
        <button className="icon-btn" id="btn-settings" title="Settings">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>
            settings
          </span>
        </button>

        {/* Profile */}
        <div className="user-avatar" title="Command Officer — CO">
          CO
        </div>
      </div>
    </header>
  );
}
