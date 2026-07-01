import type { BottomTab } from '../App';

interface BottomPanelProps {
  open: boolean;
  setOpen: (v: boolean) => void;
  activeTab: BottomTab;
  setActiveTab: (t: BottomTab) => void;
  sidebarCollapsed: boolean;
}

const TABS: { id: BottomTab; icon: string; label: string }[] = [
  { id: 'logs',     icon: 'terminal',       label: 'Live Logs' },
  { id: 'routes',   icon: 'alt_route',      label: 'Route History' },
  { id: 'requests', icon: 'emergency',      label: 'Emergency Requests' },
  { id: 'agents',   icon: 'smart_toy',      label: 'Agent Tasks' },
];

const MOCK_LOGS = [
  { time: '22:18:04', level: 'info',    msg: '[WEBSOCKET] Connected to backend — ws://localhost:8000/ws' },
  { time: '22:18:07', level: 'success', msg: '[GRAPH] Road network loaded: 4218 segments, 2847 nodes' },
  { time: '22:18:12', level: 'info',    msg: '[AI] SegFormer-B2 model loaded on CUDA device' },
  { time: '22:19:01', level: 'warn',    msg: '[ALERT] Flood zone detected near Ukkadam Lake — Zone 4 affected' },
  { time: '22:19:14', level: 'info',    msg: '[ROUTE] Emergency route computed: Ambulance-7 → Coimbatore Medical College' },
  { time: '22:19:33', level: 'warn',    msg: '[ROAD] Critical segment #1842 (Avinashi Rd) — centrality 0.94' },
  { time: '22:20:01', level: 'success', msg: '[SATELLITE] Sentinel-2A imagery sync complete — 2 tiles' },
  { time: '22:20:15', level: 'info',    msg: '[AGENT] PlannerAgent dispatched — priority: EMERGENCY' },
  { time: '22:21:00', level: 'error',   msg: '[ROAD] Segment #2011 blocked — flood water depth 1.2m' },
  { time: '22:21:02', level: 'info',    msg: '[ROUTE] Rerouting via Race Course Rd — alternate confirmed' },
];

const MOCK_ROUTES = [
  { id: 'RT-2041', algo: 'A*', from: 'Gandhipuram', to: 'CMCH', dist: '3.8 km', time: '8 min', vehicle: 'Ambulance', status: 'Active' },
  { id: 'RT-2040', algo: 'Dijkstra', from: 'Peelamedu', to: 'KMCH', dist: '5.1 km', time: '14 min', vehicle: 'Ambulance', status: 'Completed' },
  { id: 'RT-2039', algo: 'A*', from: 'Ukkadam', to: 'Fire Station-2', dist: '2.3 km', time: '6 min', vehicle: 'Fire Truck', status: 'Completed' },
  { id: 'RT-2038', algo: "Yen's K", from: 'Saibaba Colony', to: 'Police HQ', dist: '4.7 km', time: '11 min', vehicle: 'Police', status: 'Completed' },
  { id: 'RT-2037', algo: 'A*', from: 'Singanallur', to: 'CMCH', dist: '6.2 km', time: '17 min', vehicle: 'Rescue Van', status: 'Completed' },
];

const MOCK_REQUESTS = [
  { id: 'ER-504', type: 'Medical', location: 'Ukkadam, Zone-4', priority: 'Critical', time: '22:20', unit: 'Ambulance-7' },
  { id: 'ER-503', type: 'Fire',    location: 'Ganapathy Industrial Area', priority: 'High',     time: '22:15', unit: 'Engine-3' },
  { id: 'ER-502', type: 'Rescue',  location: 'Trichy Rd (Near km 14)', priority: 'High',     time: '22:10', unit: 'Rescue-1' },
  { id: 'ER-501', type: 'Police',  location: 'Race Course Rd', priority: 'Medium',   time: '22:05', unit: 'PCR-9' },
];

export function BottomPanel({ open, setOpen, activeTab, setActiveTab, sidebarCollapsed }: BottomPanelProps) {
  return (
    <div
      className={`bottom-panel-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
    >
      {/* Toggle / Tab Bar */}
      <div className="bottom-panel-toggle-bar" onClick={() => setOpen(!open)}>
        <div className="bottom-toggle-tabs" onClick={e => e.stopPropagation()}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`btm-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setOpen(true);
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bottom-actions" onClick={e => e.stopPropagation()}>
          <button id="btn-export-pdf" className="bottom-action-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>
              picture_as_pdf
            </span>
            Export PDF
          </button>
          <button id="btn-export-geojson" className="bottom-action-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>
              download
            </span>
            Export GeoJSON
          </button>
          <button
            className="bottom-action-btn"
            style={{ padding: '3px 6px' }}
            onClick={() => setOpen(!open)}
            title={open ? 'Collapse panel' : 'Expand panel'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 0" }}>
              {open ? 'expand_more' : 'expand_less'}
            </span>
          </button>
        </div>
      </div>

      {/* Panel content */}
      {open && (
        <div className="bottom-panel">
          <div className="bottom-panel-content">
            {activeTab === 'logs' && (
              <div>
                {MOCK_LOGS.map((log, i) => (
                  <div key={i} className="log-row">
                    <span className="log-time">{log.time}</span>
                    <span className={`log-level ${log.level}`}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="log-msg">{log.msg}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'routes' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Route ID</th>
                    <th>Algorithm</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Distance</th>
                    <th>ETA</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_ROUTES.map(r => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--navy)', fontWeight: 700 }}>{r.id}</td>
                      <td>{r.algo}</td>
                      <td>{r.from}</td>
                      <td>{r.to}</td>
                      <td>{r.dist}</td>
                      <td>{r.time}</td>
                      <td>{r.vehicle}</td>
                      <td>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: r.status === 'Active' ? 'var(--blue-light)' : 'var(--success-light)',
                          color: r.status === 'Active' ? 'var(--navy)' : '#15803D',
                          padding: '2px 7px', borderRadius: 'var(--radius-full)'
                        }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'requests' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Priority</th>
                    <th>Time</th>
                    <th>Assigned Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_REQUESTS.map(r => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--navy)', fontWeight: 700 }}>{r.id}</td>
                      <td>{r.type}</td>
                      <td>{r.location}</td>
                      <td>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: r.priority === 'Critical' ? 'var(--danger-light)' :
                                      r.priority === 'High' ? 'var(--warning-light)' : 'var(--blue-xlight)',
                          color: r.priority === 'Critical' ? 'var(--danger)' :
                                 r.priority === 'High' ? '#92400e' : 'var(--navy)',
                          padding: '2px 7px', borderRadius: 'var(--radius-full)'
                        }}>
                          {r.priority}
                        </span>
                      </td>
                      <td>{r.time}</td>
                      <td>{r.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'agents' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { name: 'Planner Agent',   tasks: 3, done: 1, status: 'Running', icon: 'psychology' },
                  { name: 'Satellite Agent', tasks: 2, done: 2, status: 'Done',    icon: 'satellite_alt' },
                  { name: 'Vision Agent',    tasks: 4, done: 2, status: 'Running', icon: 'visibility' },
                  { name: 'Graph Agent',     tasks: 5, done: 3, status: 'Waiting', icon: 'account_tree' },
                  { name: 'Routing Agent',   tasks: 8, done: 8, status: 'Done',    icon: 'route' },
                  { name: 'Report Agent',    tasks: 1, done: 0, status: 'Idle',    icon: 'summarize' },
                ].map(agent => (
                  <div key={agent.name} style={{
                    background: 'var(--bg-subtle)',
                    border: '1.5px solid var(--blue-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="material-symbols-outlined" style={{
                        fontSize: 16, color: 'var(--navy)',
                        fontVariationSettings: "'FILL' 1"
                      }}>
                        {agent.icon}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {agent.name}
                      </span>
                      <span className={`agent-status-badge ${agent.status.toLowerCase()}`} style={{ marginLeft: 'auto' }}>
                        {agent.status}
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{
                        height: '100%',
                        width: `${(agent.done / agent.tasks) * 100}%`,
                        background: agent.status === 'Done' ? 'var(--success)' : 'var(--blue-accent)',
                        borderRadius: 2
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
                      {agent.done}/{agent.tasks} tasks completed
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
