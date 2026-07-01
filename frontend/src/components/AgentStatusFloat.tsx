import { useState, useEffect } from 'react';

type AgentStatus = 'running' | 'waiting' | 'done' | 'error' | 'idle';

interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  detail?: string;
}

const INITIAL_AGENTS: Agent[] = [
  { id: 'planner',   name: 'Planner Agent',   status: 'running', detail: 'Optimizing routes...' },
  { id: 'satellite', name: 'Satellite Agent',  status: 'done',    detail: 'Last sync: 2 min ago' },
  { id: 'vision',    name: 'Vision Agent',     status: 'running', detail: 'Analyzing imagery...' },
  { id: 'graph',     name: 'Graph Agent',      status: 'waiting', detail: 'Queue position: 2' },
  { id: 'routing',   name: 'Routing Agent',    status: 'done',    detail: '41 routes computed' },
  { id: 'report',    name: 'Report Agent',     status: 'idle',    detail: 'Standby' },
];

export function AgentStatusFloat() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [tick, setTick] = useState(0);

  // Simulate status changes
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      setAgents(prev => prev.map(agent => {
        if (agent.id === 'planner') {
          return { ...agent, status: 'running', detail: `${Math.floor(Math.random() * 30) + 1}s elapsed` };
        }
        if (agent.id === 'vision') {
          return { ...agent, status: Math.random() > 0.3 ? 'running' : 'waiting' };
        }
        return agent;
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const runningCount = agents.filter(a => a.status === 'running').length;

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <span>Agent Status</span>
        <span style={{
          fontSize: 9,
          background: runningCount > 0 ? 'var(--blue-light)' : 'var(--bg-hover)',
          color: runningCount > 0 ? 'var(--navy)' : 'var(--text-muted)',
          padding: '1px 6px',
          borderRadius: 'var(--radius-full)',
          fontWeight: 700,
        }}>
          {runningCount} ACTIVE
        </span>
      </div>
      <div className="agent-list">
        {agents.map(agent => (
          <div key={agent.id} className="agent-item" title={agent.detail}>
            <div>
              <div className="agent-name">{agent.name}</div>
              {agent.detail && (
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1, fontFamily: 'var(--font-data)' }}>
                  {agent.detail}
                </div>
              )}
            </div>
            <span className={`agent-status-badge ${agent.status}`}>
              {agent.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
