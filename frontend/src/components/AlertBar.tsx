import { useMapStore } from '../store/mapStore';

export function AlertBar() {
  const { alerts, dismissAlert } = useMapStore();

  if (alerts.length === 0) return null;

  return (
    <div className="alert-bar">
      {alerts.map((alert) => (
        <div key={alert.id} className={`alert-item ${alert.severity}`}>
          <div className="alert-message">{alert.message}</div>
          <button className="alert-dismiss" onClick={() => dismissAlert(alert.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
