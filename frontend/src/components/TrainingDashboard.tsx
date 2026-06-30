import { useState, useEffect } from 'react';
import { useMapStore } from '../store/mapStore';
import { startTraining, stopTraining, evaluateAccuracy, getTrainingStatus } from '../api/client';

export function TrainingDashboard() {
  const { trainingState, setTrainingState } = useMapStore();
  const [maxEpochs, setMaxEpochs] = useState(5);
  const [batchSize, setBatchSize] = useState(2);
  const [lr, setLr] = useState(0.00006);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Sync state on component mount
  useEffect(() => {
    getTrainingStatus()
      .then((status) => {
        setTrainingState(status);
        if (status.max_epochs) setMaxEpochs(status.max_epochs);
      })
      .catch((err) => console.error('Failed to get training status:', err));
  }, []);

  const handleStart = async () => {
    try {
      await startTraining({ max_epochs: maxEpochs, batch_size: batchSize, lr });
    } catch (err) {
      console.error(err);
    }
  };

  const handleStop = async () => {
    try {
      await stopTraining();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      await evaluateAccuracy();
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Helper to render custom SVG charts
  const renderSVGChart = (
    title: string,
    trainData: number[],
    valData: number[],
    trainLabel: string,
    valLabel: string,
    colorTrain = '#3b82f6',
    colorVal = '#10b981'
  ) => {
    const pointsCount = trainData.length;
    if (pointsCount === 0) {
      return (
        <div className="chart-empty">
          <span>Waiting for epoch data…</span>
        </div>
      );
    }

    const width = 300;
    const height = 150;
    const padding = 25;

    const allValues = [...trainData, ...valData];
    const minVal = Math.min(...allValues) * 0.95;
    const maxVal = Math.max(...allValues) * 1.05;
    const valRange = maxVal - minVal || 1;

    const getX = (index: number) => {
      if (pointsCount <= 1) return padding;
      return padding + (index / (pointsCount - 1)) * (width - 2 * padding);
    };

    const getY = (value: number) => {
      return height - padding - ((value - minVal) / valRange) * (height - 2 * padding);
    };

    const trainPoints = trainData.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
    const valPoints = valData.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');

    return (
      <div className="chart-wrapper">
        <div className="chart-header">
          <span className="chart-title-small">{title}</span>
          <div className="chart-legend">
            <span style={{ color: colorTrain }}>● {trainLabel}</span>
            <span style={{ color: colorVal }}>● {valLabel}</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--border)" strokeWidth={1} />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" strokeWidth={1} />

          {/* Min / Max Labels */}
          <text x={padding - 5} y={padding + 5} fill="var(--text-secondary)" fontSize="9" textAnchor="end">
            {maxVal.toFixed(3)}
          </text>
          <text x={padding - 5} y={height - padding} fill="var(--text-secondary)" fontSize="9" textAnchor="end">
            {minVal.toFixed(3)}
          </text>

          {/* Data Lines */}
          <polyline fill="none" stroke={colorTrain} strokeWidth="2" points={trainPoints} />
          <polyline fill="none" stroke={colorVal} strokeWidth="2" strokeDasharray="3,3" points={valPoints} />

          {/* Dots */}
          {trainData.map((v, i) => (
            <circle key={`t-${i}`} cx={getX(i)} cy={getY(v)} r="3" fill={colorTrain} />
          ))}
          {valData.map((v, i) => (
            <circle key={`v-${i}`} cx={getX(i)} cy={getY(v)} r="3" fill={colorVal} />
          ))}
        </svg>
      </div>
    );
  };

  const elapsed = trainingState.started_at
    ? Math.round(
        (trainingState.finished_at || Date.now() / 1000) - trainingState.started_at
      )
    : 0;

  return (
    <div className="card training-card">
      <div className="card-title">
        <span className="card-icon">🏋️</span>
        Real-Time Training Dashboard
      </div>

      {/* Control Panel */}
      <div className="training-controls section-divider">
        <div className="input-group">
          <label>Epochs</label>
          <input
            type="number"
            value={maxEpochs}
            onChange={(e) => setMaxEpochs(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={trainingState.status === 'running'}
            min={1}
            max={100}
          />
        </div>
        <div className="input-group">
          <label>Batch Size</label>
          <select
            value={batchSize}
            onChange={(e) => setBatchSize(parseInt(e.target.value))}
            disabled={trainingState.status === 'running'}
          >
            <option value={1}>1</option>
            <option value={2}>2 (Recommended)</option>
            <option value={4}>4</option>
            <option value={8}>8</option>
          </select>
        </div>
        <div className="input-group">
          <label>Learning Rate</label>
          <input
            type="number"
            step="0.00001"
            value={lr}
            onChange={(e) => setLr(parseFloat(e.target.value) || 0.00006)}
            disabled={trainingState.status === 'running'}
          />
        </div>

        <div className="action-buttons">
          {trainingState.status === 'running' ? (
            <button className="btn btn-danger btn-full" onClick={handleStop}>
              Stop Training (Graceful)
            </button>
          ) : (
            <button className="btn btn-primary btn-full" onClick={handleStart} disabled={isEvaluating}>
              Start SegFormer-B2 Training
            </button>
          )}

          <button
            className="btn btn-ghost btn-full"
            onClick={handleEvaluate}
            disabled={trainingState.status === 'running' || isEvaluating}
          >
            {isEvaluating ? 'Evaluating Metrics…' : 'Evaluate Current Weights'}
          </button>
        </div>
      </div>

      {/* Status Panel */}
      <div className="status-display section-divider">
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Status</span>
            <span className={`status-val badge-${trainingState.status}`}>
              {trainingState.status.toUpperCase()}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Epoch</span>
            <span className="status-val">
              {trainingState.epoch} / {trainingState.max_epochs || maxEpochs}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Elapsed Time</span>
            <span className="status-val">{elapsed}s</span>
          </div>
          <div className="status-item">
            <span className="status-label">Device</span>
            <span className="status-val">{trainingState.device || 'CPU/GPU'}</span>
          </div>
        </div>

        {trainingState.status === 'running' && trainingState.max_epochs > 0 && (
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${(trainingState.epoch / trainingState.max_epochs) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Evaluation Result overlay/box */}
      {trainingState.evaluationResult && (
        <div className="eval-result-card section-divider">
          <span className="eval-header">📊 VAL SET ACCURACY REPORT</span>
          <div className="eval-grid">
            <div className="eval-item">
              <span className="eval-lbl">Accuracy</span>
              <span className="eval-v">{trainingState.evaluationResult.metrics.pixel_accuracy}%</span>
            </div>
            <div className="eval-item">
              <span className="eval-lbl">Val IoU</span>
              <span className="eval-v">{trainingState.evaluationResult.metrics.iou}%</span>
            </div>
            <div className="eval-item">
              <span className="eval-lbl">F1-Score</span>
              <span className="eval-v">{trainingState.evaluationResult.metrics.f1_score}%</span>
            </div>
            <div className="eval-item">
              <span className="eval-lbl">Loss</span>
              <span className="eval-v">{trainingState.evaluationResult.metrics.val_loss.toFixed(4)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="charts-container">
        {renderSVGChart(
          'Loss Curves (Smaller is Better)',
          trainingState.history.train_loss,
          trainingState.history.val_loss,
          'Train Loss',
          'Val Loss',
          '#ef4444',
          '#f59e0b'
        )}
        {renderSVGChart(
          'Mean IoU Accuracy Curves',
          trainingState.history.train_iou,
          trainingState.history.val_iou,
          'Train IoU',
          'Val IoU',
          '#3b82f6',
          '#10b981'
        )}
      </div>
    </div>
  );
}
