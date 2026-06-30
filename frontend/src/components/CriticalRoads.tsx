import { useEffect, useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { getCriticalRoads } from '../api/client';

export function CriticalRoads() {
  const { criticalRoads, setCriticalRoads, addAlert, isLoading, setLoading } = useMapStore();
  const [topN, setTopN] = useState(10);

  const fetchCriticalData = async () => {
    setLoading(true, 'Analyzing road graph centralities...');
    try {
      const data = await getCriticalRoads(topN);
      setCriticalRoads(data.roads);
      addAlert(
        'graph_update',
        `Identified top ${data.roads.length} critical roads in Coimbatore network.`,
        'info'
      );
    } catch (err: any) {
      console.error(err);
      addAlert(
        'critical_roads_error',
        'Could not fetch critical roads. Build the graph first.',
        'warning'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    fetchCriticalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topN]);

  return (
    <div className="card">
      <div className="card-title">
        <span className="card-icon">⚡</span>
        Critical Infrastructure Analysis
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Highlighted segments show high **betweenness centrality**. Blocking these road sections
          significantly isolates parts of Coimbatore.
        </p>

        <div className="flex items-center justify-between">
          <label style={{ margin: 0 }}>Show Top</label>
          <select
            value={topN}
            onChange={(e) => setTopN(parseInt(e.target.value))}
            style={{ width: '80px', padding: '4px' }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>

        <button
          onClick={fetchCriticalData}
          className="btn btn-ghost btn-sm btn-full"
          disabled={isLoading}
        >
          Re-Analyze Centralities
        </button>

        {criticalRoads.length > 0 && (
          <div className="mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {criticalRoads.map((road, idx) => {
              const scorePercent = Math.min(100, Math.round(road.centrality_score * 1000));
              return (
                <div key={road.segment_id} className="critical-road-item">
                  <span className="critical-road-rank">#{idx + 1}</span>
                  <div className="critical-road-bar-container">
                    <div className="critical-road-bar" style={{ width: `${scorePercent || 5}%` }} />
                  </div>
                  <span className="critical-road-score">{(road.centrality_score).toFixed(4)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
