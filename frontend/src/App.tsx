import { useEffect, useState } from 'react';
import { useMapStore } from './store/mapStore';
import { connectWebSocket, disconnectWebSocket } from './api/websocket';
import { MapCanvas } from './components/MapCanvas';
import { AlertBar } from './components/AlertBar';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { RightPanel } from './components/RightPanel';
import { StatsBar } from './components/StatsBar';
import { BottomPanel } from './components/BottomPanel';
import { RoutePlannerFloat } from './components/RoutePlannerFloat';
import { AIAssistantFloat } from './components/AIAssistantFloat';
import { AgentStatusFloat } from './components/AgentStatusFloat';

export type NavTab = 
  | 'dashboard' | 'livemap' | 'routing' | 'simulation'
  | 'critical' | 'infrastructure' | 'ai' | 'reports' | 'settings';

export type BottomTab = 'logs' | 'routes' | 'requests' | 'agents';

export default function App() {
  const [activeNav, setActiveNav] = useState<NavTab>('livemap');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('logs');
  const [showRoutePlanner, setShowRoutePlanner] = useState(true);
  const [showAI, setShowAI] = useState(true);
  const [showLayers, setShowLayers] = useState(false);

  const { isLoading, loadingMessage } = useMapStore();

  useEffect(() => {
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  return (
    <div className="app-shell">
      {/* TOP BAR */}
      <TopBar sidebarCollapsed={sidebarCollapsed} />

      {/* SIDEBAR */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* MAIN AREA */}
      <main className="main-area" style={{ gridArea: 'main', position: 'relative', overflow: 'hidden' }}>
        {/* Stats Bar */}
        <StatsBar />

        {/* Map Zone */}
        <div className="map-zone">
          <div className="map-container">
            <MapCanvas showLayers={showLayers} setShowLayers={setShowLayers} />
          </div>

          {/* Floating Route Planner */}
          {showRoutePlanner && (
            <RoutePlannerFloat onClose={() => setShowRoutePlanner(false)} />
          )}

          {/* Floating AI Assistant */}
          {showAI && (
            <AIAssistantFloat onClose={() => setShowAI(false)} />
          )}

          {/* Agent Status Float */}
          <AgentStatusFloat />

          {/* Restore buttons if closed */}
          {!showRoutePlanner && (
            <button
              style={{
                position: 'absolute', bottom: 80, left: 12, zIndex: 400,
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', background: 'var(--navy)', color: 'var(--white)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-sm)'
              }}
              onClick={() => setShowRoutePlanner(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>route</span>
              Route Planner
            </button>
          )}
          {!showAI && (
            <button
              style={{
                position: 'absolute', top: 12, right: 12, zIndex: 400,
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', background: 'var(--navy)', color: 'var(--white)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-sm)'
              }}
              onClick={() => setShowAI(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
              AI Assistant
            </button>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="loading-overlay">
              <div className="spinner" />
              <div className="loading-text">{loadingMessage || 'Processing...'}</div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <RightPanel />

        {/* BOTTOM PANEL */}
        <BottomPanel
          open={bottomOpen}
          setOpen={setBottomOpen}
          activeTab={bottomTab}
          setActiveTab={setBottomTab}
          sidebarCollapsed={sidebarCollapsed}
        />
      </main>

      {/* Alert toasts */}
      <AlertBar />
    </div>
  );
}
