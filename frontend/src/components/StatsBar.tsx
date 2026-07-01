import { useMapStore } from '../store/mapStore';

interface StatCard {
  icon: string;
  iconColor: 'blue' | 'red' | 'orange' | 'green' | 'navy';
  label: string;
  value: string | number;
  numColor?: 'red' | 'orange' | 'green' | 'blue';
  trend: string;
  trendDir: 'up' | 'down' | 'neutral';
  cardVariant?: 'danger-card' | 'warning-card' | 'success-card';
  bars: number[]; // 0-100
  barColor?: 'red' | 'orange' | 'green';
}

function MiniChart({ bars, color }: { bars: number[]; color?: string }) {
  const max = Math.max(...bars, 1);
  return (
    <div className="mini-chart">
      {bars.map((v, i) => (
        <div
          key={i}
          className={`mini-bar ${color || ''} ${i === bars.length - 1 ? 'active' : ''}`}
          style={{ height: `${Math.round((v / max) * 22)}px` }}
        />
      ))}
    </div>
  );
}

export function StatsBar() {
  const { stats } = useMapStore();

  const cards: StatCard[] = [
    {
      icon: 'warning',
      iconColor: 'red',
      label: 'Critical Roads',
      value: stats?.counts.critical_segments ?? 14,
      numColor: 'red',
      trend: '+2 since 1h ago',
      trendDir: 'up',
      cardVariant: 'danger-card',
      bars: [6, 8, 9, 12, 10, 13, 14],
      barColor: 'red',
    },
    {
      icon: 'block',
      iconColor: 'orange',
      label: 'Blocked Roads',
      value: stats?.counts.blocked_segments ?? 7,
      numColor: 'orange',
      trend: '−1 from yesterday',
      trendDir: 'down',
      cardVariant: 'warning-card',
      bars: [10, 9, 8, 9, 7, 8, 7],
      barColor: 'orange',
    },
    {
      icon: 'local_shipping',
      iconColor: 'blue',
      label: 'Emergency Vehicles',
      value: 23,
      trend: '↑ 4 deployed',
      trendDir: 'up',
      bars: [12, 15, 18, 20, 19, 22, 23],
    },
    {
      icon: 'timer',
      iconColor: 'navy',
      label: 'Avg Response Time',
      value: '8.4m',
      trend: '−0.6m improved',
      trendDir: 'down',
      bars: [10, 10, 9, 9, 9, 8, 8],
    },
    {
      icon: 'flood',
      iconColor: 'red',
      label: 'Flooded Areas',
      value: stats?.counts.active_disasters ?? 3,
      numColor: 'orange',
      trend: 'Stable',
      trendDir: 'neutral',
      cardVariant: 'warning-card',
      bars: [1, 2, 3, 3, 3, 3, 3],
      barColor: 'orange',
    },
    {
      icon: 'alt_route',
      iconColor: 'green',
      label: 'Safe Routes',
      value: stats?.counts.routes_computed ?? 41,
      numColor: 'green',
      trend: '+3 since last check',
      trendDir: 'down',
      cardVariant: 'success-card',
      bars: [30, 33, 36, 38, 39, 40, 41],
      barColor: 'green',
    },
  ];

  return (
    <div className="stats-bar" role="region" aria-label="Key statistics">
      {cards.map((card, idx) => (
        <div key={idx} className={`stat-card${card.cardVariant ? ' ' + card.cardVariant : ''}`}>
          <div className={`stat-card-icon ${card.iconColor}`}>
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {card.icon}
            </span>
          </div>
          <div className="stat-card-body">
            <div className={`stat-number ${card.numColor || ''}`}>{card.value}</div>
            <div className="stat-title">{card.label}</div>
            <div className={`stat-trend ${card.trendDir}`}>{card.trend}</div>
            <MiniChart bars={card.bars} color={card.barColor} />
          </div>
        </div>
      ))}
    </div>
  );
}
