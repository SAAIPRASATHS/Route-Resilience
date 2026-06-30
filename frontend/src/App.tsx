import { useEffect, useState } from 'react';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'routing' | 'disaster' | 'critical' | 'training'>('pipeline');
  const { isLoading, loadingMessage, stats } = useMapStore();

  useEffect(() => {
    // Connect websocket
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-icon">🛰️</div>
          <div>
            <h1 className="header-title">Route Resilience AI</h1>
            <p className="header-subtitle">Road Intelligence & Emergency Navigation — Coimbatore</p>
          </div>
        </div>

        <div className="header-status">
          <div className={`status-badge ${stats?.network_health?.status === 'critical' ? 'critical' : 'operational'}`}>
            <span className="status-dot" />
            {stats?.network_health?.status === 'critical' ? 'Flood Alert / Active Incidents' : 'Network Fully Operational'}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${activeTab === 'pipeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('pipeline')}
            >
              Pipeline
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'routing' ? 'active' : ''}`}
              onClick={() => setActiveTab('routing')}
            >
              Route
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'disaster' ? 'active' : ''}`}
              onClick={() => setActiveTab('disaster')}
            >
              Disaster
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'critical' ? 'active' : ''}`}
              onClick={() => setActiveTab('critical')}
            >
              Critical
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'training' ? 'active' : ''}`}
              onClick={() => setActiveTab('training')}
            >
              Train
            </button>
          </div>

          <div className="sidebar-content">
            <StatsPanel />

            {activeTab === 'pipeline' && <PipelineControl />}
            {activeTab === 'routing' && <RoutePanel />}
            {activeTab === 'disaster' && <DisasterOverlay />}
            {activeTab === 'critical' && <CriticalRoads />}
            {activeTab === 'training' && <TrainingDashboard />}
          </div>
        </aside>

        {/* Map Canvas */}
        <MapCanvas />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner" />
            <div className="loading-text">{loadingMessage || 'Processing...'}</div>
          </div>
        )}
      </div>

      {/* Floating Notifications */}
      <AlertBar />
    </div>
  );
}
