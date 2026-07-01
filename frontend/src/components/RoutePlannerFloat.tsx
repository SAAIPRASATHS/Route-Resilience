import { useState } from 'react';

interface RoutePlannerFloatProps {
  onClose: () => void;
}

export function RoutePlannerFloat({ onClose }: RoutePlannerFloatProps) {
  const [source, setSource] = useState('');
  const [dest, setDest] = useState('');
  const [vehicle, setVehicle] = useState('ambulance');
  const [priority, setPriority] = useState('emergency');

  return (
    <div className="route-planner-panel">
      <div className="float-panel-header">
        <div className="float-panel-title">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            route
          </span>
          Emergency Route Planner
        </div>
        <button className="float-panel-close" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="float-panel-body">
        {/* Source */}
        <div className="fp-field">
          <label className="fp-label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1", color: 'var(--success)' }}>
                radio_button_checked
              </span>
              Source Location
            </span>
          </label>
          <input
            id="route-source"
            className="fp-input"
            type="text"
            placeholder="Enter origin..."
            value={source}
            onChange={e => setSource(e.target.value)}
          />
        </div>

        {/* Destination */}
        <div className="fp-field">
          <label className="fp-label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1", color: 'var(--danger)' }}>
                location_on
              </span>
              Destination
            </span>
          </label>
          <input
            id="route-destination"
            className="fp-input"
            type="text"
            placeholder="Enter destination..."
            value={dest}
            onChange={e => setDest(e.target.value)}
          />
        </div>

        <div className="fp-row">
          {/* Vehicle Type */}
          <div className="fp-field">
            <label className="fp-label">Vehicle</label>
            <select
              id="route-vehicle"
              className="fp-select"
              value={vehicle}
              onChange={e => setVehicle(e.target.value)}
            >
              <option value="ambulance">🚑 Ambulance</option>
              <option value="fire">🚒 Fire Truck</option>
              <option value="police">🚓 Police</option>
              <option value="rescue">🚐 Rescue Van</option>
              <option value="heavy">🚛 Heavy Vehicle</option>
            </select>
          </div>

          {/* Priority */}
          <div className="fp-field">
            <label className="fp-label">Priority</label>
            <select
              id="route-priority"
              className="fp-select"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              <option value="emergency">🔴 Emergency</option>
              <option value="high">🟠 High</option>
              <option value="normal">🟡 Normal</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
        </div>

        <hr className="fp-divider" />

        {/* Action Buttons */}
        <button id="btn-fastest-route" className="fp-btn fp-btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>
            speed
          </span>
          Find Fastest Route
        </button>

        <div className="fp-row">
          <button id="btn-safest-route" className="fp-btn fp-btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>
              shield
            </span>
            Safest
          </button>
          <button id="btn-avoid-flood" className="fp-btn fp-btn-danger">
            <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>
              water
            </span>
            Avoid Flood
          </button>
        </div>

        <button id="btn-generate-report" className="fp-btn fp-btn-secondary">
          <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>
            summarize
          </span>
          Generate Route Report
        </button>
      </div>
    </div>
  );
}
