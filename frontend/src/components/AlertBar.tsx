import { useMapStore } from '../store/mapStore';

export function AlertBar() {
  const { alerts, dismissAlert } = useMapStore();

  if (alerts.length === 0) return null;

  return (
    <div className="alert-toast-container" role="region" aria-label="System alerts">
      {alerts.slice(0, 4).map(alert => (
        <div key={alert.id} className={`alert-toast ${alert.severity}`}>
          <span className="toast-icon">
            {alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <div className="toast-body">
            <div className="toast-title">{alert.event}</div>
            <div className="toast-msg">{alert.message}</div>
          </div>
          <button
            className="toast-dismiss"
            onClick={() => dismissAlert(alert.id)}
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
