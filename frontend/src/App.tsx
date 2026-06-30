import { useEffect, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from './store/mapStore';
import { connectWebSocket, disconnectWebSocket } from './api/websocket';
import { MapCanvas } from './components/MapCanvas';
import { RoutePanel } from './components/RoutePanel';
import { CriticalRoads } from './components/CriticalRoads';
import { DisasterOverlay } from './components/DisasterOverlay';
import { StatsPanel } from './components/StatsPanel';
import { PipelineControl } from './components/PipelineControl';
import { TrainingDashboard } from './components/TrainingDashboard';
import { AlertBar } from './components/AlertBar';
import { RightPanel } from './components/RightPanel';
import { AiAssistant } from './components/AiAssistant';
import { TrafficIntelligence } from './components/TrafficIntelligence';
import { DroneFeed } from './components/DroneFeed';
import { PredictiveFailure } from './components/PredictiveFailure';
import { AgentCoordination } from './components/AgentCoordination';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'routing' | 'disaster' | 'critical' | 'ai' | 'training' | 'traffic' | 'drone' | 'predictive' | 'agents'>('dashboard');
  const { isLoading, loadingMessage, stats } = useMapStore();

  useEffect(() => {
    // Connect websocket
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="header">
        <div className="header-brand">
          <div className="header-icon">🛰️</div>
          <div>
            <h1 className="header-title">Route Resilience AI</h1>
            <p className="header-subtitle">Enterprise Command Center</p>
          </div>
        </div>

        <div className="header-search">
          <span className="header-search-icon">🔍</span>
          <input type="text" placeholder="Search locations, hospitals, emergency units..." />
        </div>

        <div className="header-right">
          <div className="header-status">
            <div className={`status-badge ${stats?.network_health?.status === 'critical' ? 'critical' : 'operational'}`}>
              <span className="status-dot" />
              {stats?.network_health?.status === 'critical' ? 'Active Incidents Detected' : 'System Operational'}
            </div>
          </div>
          
          <button className="header-btn" title="Notifications">
            🔔
            <span className="notif-dot"></span>
          </button>
          
          <div className="header-avatar" title="User Profile">
            CO
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        
        {/* Left Icon Sidebar */}
        <nav className="icon-sidebar">
          <button className={`icon-sidebar-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} title="Dashboard">
            📊
            <span>Dash</span>
          </button>
          <button className={`icon-sidebar-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')} title="Live Map">
            🗺️
            <span>Map</span>
          </button>
          <button className={`icon-sidebar-btn ${activeTab === 'routing' ? 'active' : ''}`} onClick={() => setActiveTab('routing')} title="Emergency Routing">
            🚑
            <span>Route</span>
          </button>
          <button className={`icon-sidebar-btn ${activeTab === 'disaster' ? 'active' : ''}`} onClick={() => setActiveTab('disaster')} title="Disaster Simulation">
            ⚠️
            <span>Sim</span>
          </button>
          <button className={`icon-sidebar-btn ${activeTab === 'critical' ? 'active' : ''}`} onClick={() => setActiveTab('critical')} title="Critical Infrastructure">
            ⚡
            <span>Infra</span>
          </button>
          <button className={`icon-sidebar-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')} title="AI Assistant">
            🤖
            <span>AI</span>
          </button>
          <button className={`icon-sidebar-btn ${activeTab === 'training' ? 'active' : ''}`} onClick={() => setActiveTab('training')} title="Training">
            🧠
            <span>Train</span>
          </button>
          
          <div className="icon-sidebar-spacer" style={{ height: '2px', background: 'var(--border)', margin: '8px 12px' }}></div>

          <button className={`icon-sidebar-btn ${activeTab === 'traffic' ? 'active' : ''}`} onClick={() => setActiveTab('traffic')} title="Live Traffic">
            🚦
            <span>Traffic</span>
          </button>
          <button className={`icon-sidebar-btn ${activeTab === 'drone' ? 'active' : ''}`} onClick={() => setActiveTab('drone')} title="Drone Feed">
            🚁
            <span>Drone</span>
          </button>
          <button className={`icon-sidebar-btn ${activeTab === 'predictive' ? 'active' : ''}`} onClick={() => setActiveTab('predictive')} title="Predictive Risk">
            🔮
            <span>Predict</span>
          </button>
          <button className={`icon-sidebar-btn ${activeTab === 'agents' ? 'active' : ''}`} onClick={() => setActiveTab('agents')} title="Agent Coordination">
            🤝
            <span>Agents</span>
          </button>
          
          <div className="icon-sidebar-spacer"></div>
          
          <button className="icon-sidebar-btn" title="Settings">
            ⚙️
            <span>Config</span>
          </button>
        </nav>

        {/* Content Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2 className="sidebar-header-title">
              <span className="sidebar-icon">
                {activeTab === 'dashboard' && '📊'}
                {activeTab === 'map' && '🗺️'}
                {activeTab === 'routing' && '🚑'}
                {activeTab === 'disaster' && '⚠️'}
                {activeTab === 'critical' && '⚡'}
                {activeTab === 'ai' && '🤖'}
                {activeTab === 'training' && '🧠'}
              </span>
              {activeTab === 'dashboard' && 'System Overview'}
              {activeTab === 'map' && 'Live Inference Pipeline'}
              {activeTab === 'routing' && 'Emergency Routing'}
              {activeTab === 'disaster' && 'Disaster Simulation'}
              {activeTab === 'critical' && 'Infrastructure Analysis'}
              {activeTab === 'ai' && 'AI Assistant'}
              {activeTab === 'training' && 'Model Training'}
              {activeTab === 'traffic' && 'Live Traffic Intelligence'}
              {activeTab === 'drone' && 'UAV Surveillance Feed'}
              {activeTab === 'predictive' && 'Predictive Road Failure'}
              {activeTab === 'agents' && 'Multi-Agent Coordination'}
            </h2>
            <p className="sidebar-header-subtitle">
              {activeTab === 'dashboard' && 'Real-time city analytics and metrics.'}
              {activeTab === 'map' && 'Ingest satellite data & extract roads.'}
              {activeTab === 'routing' && 'Calculate resilient paths for first responders.'}
              {activeTab === 'disaster' && 'Simulate catastrophic network failures.'}
              {activeTab === 'critical' && 'Identify choke points using graph centrality.'}
              {activeTab === 'ai' && 'Ask the system for insights and reports.'}
              {activeTab === 'training' && 'Train and evaluate the SegFormer model.'}
              {activeTab === 'traffic' && 'Real-time urban congestion mapping.'}
              {activeTab === 'drone' && 'Live video link for occlusion penetration.'}
              {activeTab === 'predictive' && 'ML risk assessment for infrastructure.'}
              {activeTab === 'agents' && 'Autonomous AI negotiation & dispatch.'}
            </p>
          </div>

          <div className="sidebar-content">
            {activeTab === 'dashboard' && <StatsPanel />}
            {activeTab === 'map' && <PipelineControl />}
            {activeTab === 'routing' && <RoutePanel />}
            {activeTab === 'disaster' && <DisasterOverlay />}
            {activeTab === 'critical' && <CriticalRoads />}
            {activeTab === 'ai' && <AiAssistant />}
            {activeTab === 'training' && <TrainingDashboard />}
            {activeTab === 'traffic' && <TrafficIntelligence />}
            {activeTab === 'drone' && <DroneFeed />}
            {activeTab === 'predictive' && <PredictiveFailure />}
            {activeTab === 'agents' && <AgentCoordination />}
          </div>
        </aside>

        {/* Map Canvas (Center) */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <MapCanvas />
          
          {/* Bottom Log Bar */}
          <div className="bottom-bar">
            <div className="bottom-bar-left">
              <div className="bottom-bar-item">
                <span className={`bottom-bar-dot ${stats?.network_health?.status === 'critical' ? 'red' : 'green'}`}></span>
                WebSockets Connected
              </div>
              <div>Latest Sync: Just now</div>
            </div>
            <div className="bottom-bar-right">
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Logs</button>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Export PDF</button>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Export GeoJSON</button>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <RightPanel />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner" />
            <div className="loading-text">{loadingMessage || 'Processing Request...'}</div>
          </div>
        )}
      </div>

      {/* Floating Notifications */}
      <AlertBar />
    </div>
  );
}
