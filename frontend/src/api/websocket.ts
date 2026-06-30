import { useMapStore } from '../store/mapStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/updates';

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;

export function connectWebSocket(): WebSocket {
  if (socket && socket.readyState === WebSocket.OPEN) return socket;

  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('[WS] Connected to Route Resilience AI — Coimbatore');
    reconnectDelay = 1000;
    // Start keepalive pings
    const ping = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send('ping');
      } else {
        clearInterval(ping);
      }
    }, 30_000);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const store = useMapStore.getState();

      switch (data.event) {
        case 'connected':
          store.addAlert('connected', data.message, 'info');
          break;

        case 'training_started':
          store.setTrainingState({
            status: 'running',
            device: data.device,
            train_tiles: data.train_tiles,
            val_tiles: data.val_tiles,
            max_epochs: data.max_epochs,
            epoch: 0,
            started_at: Date.now() / 1000,
            finished_at: null,
            error: null,
            history: {
              train_loss: [], val_loss: [],
              train_iou: [], val_iou: [],
              train_acc: [], val_acc: [],
            }
          });
          store.addAlert('training_started', `🏋️ Training started on ${data.device} with ${data.train_tiles} images!`, 'info');
          break;

        case 'training_stopped':
          store.setTrainingState({ status: 'stopped' });
          store.addAlert('training_stopped', `⏹️ Training stopped at epoch ${data.epoch}`, 'warning');
          break;

        case 'training_update': {
          const h = store.trainingState.history;
          const newHistory = {
            train_loss: [...h.train_loss.slice(0, data.epoch - 1), data.train_loss],
            val_loss: [...h.val_loss.slice(0, data.epoch - 1), data.val_loss],
            train_iou: [...h.train_iou.slice(0, data.epoch - 1), data.train_iou],
            val_iou: [...h.val_iou.slice(0, data.epoch - 1), data.val_iou],
            train_acc: [...h.train_acc.slice(0, data.epoch - 1), data.train_acc],
            val_acc: [...h.val_acc.slice(0, data.epoch - 1), data.val_acc],
          };
          store.setTrainingState({
            epoch: data.epoch,
            max_epochs: data.max_epochs,
            best_iou: data.best_iou,
            best_acc: data.val_acc > store.trainingState.best_acc ? data.val_acc : store.trainingState.best_acc,
            best_epoch: data.is_best ? data.epoch : store.trainingState.best_epoch,
            history: newHistory,
          });
          if (data.is_best) {
            store.addAlert('training_best', `🏆 New Best Model! Val IoU: ${(data.val_iou * 100).toFixed(1)}%`, 'info');
          }
          break;
        }

        case 'training_done':
          store.setTrainingState({
            status: 'done',
            finished_at: Date.now() / 1000,
          });
          store.addAlert('training_done', `✅ Training finished! Best IoU: ${(data.best_iou * 100).toFixed(1)}%`, 'info');
          break;

        case 'training_error':
          store.setTrainingState({
            status: 'error',
            error: data.detail,
          });
          store.addAlert('training_error', `❌ Training error: ${data.detail}`, 'critical');
          break;

        case 'accuracy_evaluated':
          store.setTrainingState({
            evaluationResult: data,
          });
          store.addAlert('accuracy_evaluated', `📊 Model Evaluated. Val IoU: ${data.metrics.iou}% | Accuracy: ${data.metrics.pixel_accuracy}%`, 'info');
          break;

        case 'disaster_alert':
          store.addDisaster({
            disaster_id: data.disaster_id,
            disaster_type: data.type,
            severity: data.severity,
            name: data.name,
            blocked_segments: data.blocked_segments,
            geometry: data.geometry,
            alternate_route: data.alternate_route,
          });
          store.addAlert(
            'disaster_alert',
            `⚠️ ${data.severity.toUpperCase()} ${data.type}: ${data.name} — ${data.blocked_segments} roads blocked`,
            data.severity === 'high' ? 'critical' : 'warning'
          );
          break;

        case 'disaster_cleared':
          store.clearDisaster(data.disaster_id);
          store.addAlert('disaster_cleared', `Disaster #${data.disaster_id} cleared ✓`, 'info');
          break;

        case 'graph_update':
          store.addAlert('graph_update', 'Road graph updated', 'info');
          break;

        case 'pong':
          break; // keepalive response, ignore

        default:
          console.log('[WS] Unknown event:', data);
      }
    } catch (e) {
      console.error('[WS] Parse error:', e);
    }
  };

  socket.onclose = () => {
    console.warn('[WS] Disconnected. Reconnecting in', reconnectDelay, 'ms...');
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      connectWebSocket();
    }, reconnectDelay);
  };

  socket.onerror = (err) => {
    console.error('[WS] Error:', err);
  };

  return socket;
}

export function disconnectWebSocket() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  socket?.close();
  socket = null;
}
