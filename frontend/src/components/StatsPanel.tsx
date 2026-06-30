import { useEffect } from 'react';
import { useMapStore } from '../store/mapStore';
import { getStats } from '../api/client';

export function StatsPanel() {
  const { stats, setStats } = useMapStore();

  const loadStats = async () => {
    try {
      const res = await getStats();
      setStats(res);
    } catch (err) {
      console.error('Failed to retrieve dashboard stats:', err);
    }
  };

  useEffect(() => {
    loadStats();
    // Poll stats every 5 seconds
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!stats) return null;

  return (
    <div className="card">
      <div className="card-title">
        <span className="card-icon">📊</span>
        Coimbatore Network Status
      </div>

      <div className="stats-grid">
        <div className="stat-item accent">
          <div className="stat-value">{stats.counts.road_segments}</div>
          <div className="stat-label">Roads Found</div>
        </div>

        <div className="stat-item danger">
          <div className="stat-value">{stats.counts.blocked_segments}</div>
          <div className="stat-label">Blocked Roads</div>
        </div>

        <div className="stat-item success">
          <div className="stat-value">
            {stats.counts.road_segments - stats.counts.blocked_segments}
          </div>
          <div className="stat-label">Active Lanes</div>
        </div>

        <div className="stat-item warning">
          <div className="stat-value">{stats.counts.active_disasters}</div>
          <div className="stat-label">Disaster Zones</div>
        </div>
      </div>

      <div className="mt-2 p-2 rounded" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted">Network Health Index:</span>
          <span
            className={`font-semibold ${
              stats.network_health.status === 'operational' ? 'text-success' : 'text-danger'
            }`}
          >
            {100 - stats.network_health.blocked_pct}%
          </span>
        </div>
        <div className="flex justify-between items-center text-sm mt-1">
          <span className="text-muted">System State:</span>
          <span
            className={`font-bold ${
              stats.network_health.status === 'operational' ? 'text-success' : 'text-danger'
            }`}
            style={{ textTransform: 'uppercase', fontSize: '11px' }}
          >
            {stats.network_health.status}
          </span>
        </div>
      </div>
    </div>
  );
}
