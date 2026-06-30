import { useState } from 'react';

export function DroneFeed() {
  const [isActive, setIsActive] = useState(false);
  const [detections, setDetections] = useState(0);

  const toggleFeed = () => {
    setIsActive(!isActive);
    if (!isActive) {
      setDetections(Math.floor(Math.random() * 5) + 2); // random detections
    } else {
      setDetections(0);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card-title">
        <span className="card-icon">🚁</span>
        UAV Surveillance Feed
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Connect to airborne drone swarms for live occlusion penetration and high-resolution damage assessment.
      </p>

      <div 
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: isActive ? '#000' : 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {!isActive ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Camera Offline</div>
        ) : (
          <>
            {/* Simulated Drone Video Feed (using a CSS animation to simulate movement over a dark noisy background) */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'repeating-linear-gradient(45deg, #111 0, #111 2px, #222 2px, #222 4px)',
              opacity: 0.5,
              animation: 'pan 10s linear infinite'
            }} />
            
            {/* OSD (On-Screen Display) */}
            <div style={{ position: 'absolute', top: 8, left: 8, color: '#0f0', fontFamily: 'monospace', fontSize: '10px', textShadow: '0 0 2px #000' }}>
              REC <span style={{ color: 'red' }}>●</span><br/>
              ALT: 120m<br/>
              SPD: 15m/s
            </div>

            {/* Simulated Bounding Box */}
            <div style={{
              position: 'absolute', top: '30%', left: '40%', width: '20%', height: '30%',
              border: '2px solid red', backgroundColor: 'rgba(255,0,0,0.1)',
              display: 'flex', alignItems: 'flex-start'
            }}>
              <div style={{ background: 'red', color: 'white', fontSize: '9px', padding: '1px 3px' }}>
                Blocked Road (98%)
              </div>
            </div>
            
             {/* Simulated Bounding Box 2 */}
             <div style={{
              position: 'absolute', top: '60%', left: '70%', width: '15%', height: '20%',
              border: '2px solid yellow', backgroundColor: 'rgba(255,255,0,0.1)',
              display: 'flex', alignItems: 'flex-start'
            }}>
              <div style={{ background: 'yellow', color: 'black', fontSize: '9px', padding: '1px 3px' }}>
                Stranded Vehicle
              </div>
            </div>
          </>
        )}
      </div>
      
      <style>
        {`
          @keyframes pan {
            0% { background-position: 0 0; }
            100% { background-position: 100px 100px; }
          }
        `}
      </style>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button 
          className={isActive ? 'danger-btn' : 'primary-btn'} 
          style={{ flex: 1 }}
          onClick={toggleFeed}
        >
          {isActive ? 'Disconnect UAV' : 'Connect UAV-01'}
        </button>
      </div>

      {isActive && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{detections}</span> AI Detections in FOV
        </div>
      )}
    </div>
  );
}
