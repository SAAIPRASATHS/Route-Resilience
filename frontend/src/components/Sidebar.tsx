import type { NavTab } from '../App';

interface SidebarProps {
  activeNav: NavTab;
  setActiveNav: (tab: NavTab) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

interface NavItem {
  id: NavTab;
  icon: string;
  label: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',      icon: 'dashboard',          label: 'Dashboard' },
  { id: 'livemap',        icon: 'map',                label: 'Live Map',       badge: 3 },
  { id: 'routing',        icon: 'route',              label: 'Emergency Routing' },
  { id: 'simulation',     icon: 'science',            label: 'Disaster Simulation' },
  { id: 'critical',       icon: 'warning',            label: 'Critical Roads',  badge: 7 },
  { id: 'infrastructure', icon: 'account_tree',       label: 'Infrastructure' },
  { id: 'ai',             icon: 'smart_toy',          label: 'AI Assistant' },
  { id: 'reports',        icon: 'summarize',          label: 'Reports' },
  { id: 'settings',       icon: 'settings',           label: 'Settings' },
];

export function Sidebar({ activeNav, setActiveNav, collapsed, setCollapsed }: SidebarProps) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Toggle */}
      <div className="sidebar-toggle">
        <button
          className="sidebar-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}
          >
            {collapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>

      <div className="sidebar-section">
        {!collapsed && (
          <div className="sidebar-section-label">Navigation</div>
        )}

        {NAV_ITEMS.slice(0, 6).map((item) => (
          <div
            key={item.id}
            className={`nav-item${activeNav === item.id ? ' active' : ''}`}
            onClick={() => setActiveNav(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: activeNav === item.id
                  ? "'FILL' 1, 'wght' 600"
                  : "'FILL' 0, 'wght' 400"
              }}
            >
              {item.icon}
            </span>
            {!collapsed && (
              <>
                <span className="nav-label">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </>
            )}
          </div>
        ))}

        {!collapsed && (
          <div className="sidebar-section-label" style={{ marginTop: 6 }}>Tools</div>
        )}

        {NAV_ITEMS.slice(6).map((item) => (
          <div
            key={item.id}
            className={`nav-item${activeNav === item.id ? ' active' : ''}`}
            onClick={() => setActiveNav(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: activeNav === item.id
                  ? "'FILL' 1, 'wght' 600"
                  : "'FILL' 0, 'wght' 400"
              }}
            >
              {item.icon}
            </span>
            {!collapsed && (
              <span className="nav-label">{item.label}</span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div
          className="nav-item"
          title={collapsed ? 'Help & Documentation' : undefined}
          style={{ justifyContent: collapsed ? 'center' : undefined }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400", fontSize: 16 }}
          >
            help_outline
          </span>
          {!collapsed && <span className="nav-label">Help</span>}
        </div>
      </div>
    </aside>
  );
}
