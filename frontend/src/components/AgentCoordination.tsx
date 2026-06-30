import { useState, useEffect, useRef } from 'react';

type AgentMessage = {
  id: number;
  agent: 'Police' | 'Fire' | 'Medical' | 'System';
  message: string;
};

const SIMULATED_LOGS: AgentMessage[] = [
  { id: 1, agent: 'System', message: 'Major flood detected on Avinashi Road. Initiating multi-agent protocol.' },
  { id: 2, agent: 'Fire', message: 'Requesting immediate road closure at KM 4.2 to prevent civilian entry.' },
  { id: 3, agent: 'Police', message: 'Acknowledged. Dispatching unit to blockade intersection 12.' },
  { id: 4, agent: 'Medical', message: 'Hospital route obstructed. Computing alternate path via Trichy Road.' },
  { id: 5, agent: 'System', message: 'Route Resilience AI has verified Trichy Road as viable.' },
  { id: 6, agent: 'Police', message: 'Clearing Trichy Road for emergency vehicle priority.' },
  { id: 7, agent: 'Medical', message: 'Ambulance 44 rerouted successfully. ETA 8 minutes.' }
];

export function AgentCoordination() {
  const [logs, setLogs] = useState<AgentMessage[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startSimulation = () => {
    setIsSimulating(true);
    setLogs([]);
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx < SIMULATED_LOGS.length) {
        setLogs(prev => [...prev, SIMULATED_LOGS[currentIdx]]);
        currentIdx++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 2000);
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getAgentColor = (agent: string) => {
    switch (agent) {
      case 'Police': return '#3b82f6';
      case 'Fire': return '#ef4444';
      case 'Medical': return '#10b981';
      default: return '#9ca3af';
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <div className="card-title">
        <span className="card-icon">🤝</span>
        Multi-Agent Coordination
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Autonomous AI agents collaborating in real-time to solve complex logistical challenges during disasters.
      </p>

      <div 
        ref={containerRef}
        style={{ 
          flex: 1, 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border)', 
          borderRadius: 'var(--radius-sm)', 
          padding: '12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minHeight: '250px'
        }}
      >
        {logs.length === 0 && !isSimulating && (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '40px' }}>
            System Idle. Waiting for trigger event...
          </div>
        )}
        
        {logs.map((log) => (
          <div key={log.id} style={{ display: 'flex', gap: '8px', fontSize: '12px', lineHeight: '1.4' }}>
            <div style={{ 
              fontWeight: 'bold', 
              color: getAgentColor(log.agent),
              minWidth: '60px'
            }}>
              [{log.agent}]
            </div>
            <div style={{ color: 'var(--text-primary)' }}>{log.message}</div>
          </div>
        ))}
        {isSimulating && (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
            Agents are negotiating...
          </div>
        )}
      </div>

      <button className="primary-btn" onClick={startSimulation} disabled={isSimulating}>
        {isSimulating ? 'Simulation in Progress' : 'Trigger Incident Response'}
      </button>
    </div>
  );
}
