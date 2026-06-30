import { useState, useEffect } from 'react';

export function TrafficIntelligence() {
  const [trafficScore, setTrafficScore] = useState(82); // 0-100 score
  const [congestionPoints, setCongestionPoints] = useState(12);

  useEffect(() => {
    // Simulate real-time traffic updates
    const interval = setInterval(() => {
      setTrafficScore((prev) => {
        const change = Math.floor(Math.random() * 5) - 2;
        return Math.min(100, Math.max(0, prev + change));
      });
      setCongestionPoints((prev) => {
        const change = Math.floor(Math.random() * 3) - 1;
        return Math.max(0, prev + change);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card-title">
        <span className="card-icon">🚦</span>
        Live Traffic Intelligence
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Real-time congestion analysis utilizing simulated TomTom/Google Maps mobility data overlaid on our AI road extraction graph.
      </p>

      <div className="stats-grid">
        <div className={`stat-item ${trafficScore > 75 ? 'success' : trafficScore > 50 ? 'warning' : 'danger'}`}>
          <div className="stat-value">{trafficScore}/100</div>
          <div className="stat-label">Mobility Index</div>
        </div>
        <div className="stat-item warning">
          <div className="stat-value">{congestionPoints}</div>
          <div className="stat-label">Active Bottlenecks</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>CONGESTION HOTSPOTS</h4>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Avinashi Road</span>
            <span style={{ color: 'var(--danger)', fontWeight: 500 }}>Severe (12km/h)</span>
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Trichy Road</span>
            <span style={{ color: 'var(--warning)', fontWeight: 500 }}>Moderate (24km/h)</span>
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Mettupalayam Road</span>
            <span style={{ color: 'var(--success)', fontWeight: 500 }}>Clear (45km/h)</span>
          </li>
        </ul>
      </div>
      
      <button className="primary-btn" style={{ width: '100%' }}>
        Run Traffic Rerouting
      </button>
    </div>
  );
}
