import { useState } from 'react';
import { useMapStore } from '../store/mapStore';

export function PredictiveFailure() {
  const [analyzing, setAnalyzing] = useState(false);
  const [riskFactor, setRiskFactor] = useState(0);

  const runSimulation = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setRiskFactor(76);
    }, 2000);
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card-title">
        <span className="card-icon">🔮</span>
        Predictive Road Failure
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Machine Learning models analyzing soil composition, elevation, and historical weather data to predict road network vulnerabilities before they occur.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>Rainfall Forecast (48h)</span>
          <span style={{ color: 'var(--warning)' }}>Heavy (120mm)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>Soil Saturation Index</span>
          <span style={{ color: 'var(--danger)' }}>Critical (89%)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>Historical Vulnerability</span>
          <span>High Risk</span>
        </div>
      </div>

      <button className="primary-btn" onClick={runSimulation} disabled={analyzing} style={{ width: '100%', marginTop: '8px' }}>
        {analyzing ? 'Running ML Inference...' : 'Generate Risk Heatmap'}
      </button>

      {riskFactor > 0 && (
        <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={{ fontWeight: 'bold', color: 'var(--danger)' }}>High Risk Identified</div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            {riskFactor}% probability of catastrophic road failure along the Western Ghats corridor. Preventive routing protocols recommended.
          </p>
        </div>
      )}
    </div>
  );
}
