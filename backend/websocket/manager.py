"""WebSocket manager — real-time push to all connected dashboard clients."""

import json
from typing import Any
from fastapi import WebSocket
from loguru import logger


class WebSocketManager:
    """
    Manages all active WebSocket connections.
    Broadcasts JSON events to every connected client (dashboard tabs).
    """

    def __init__(self):
        self._connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.append(websocket)
        logger.info(f"WS client connected. Total: {len(self._connections)}")
        # Send welcome with Coimbatore config
        await websocket.send_json({
            "event": "connected",
            "message": "Route Resilience AI — Coimbatore Dashboard",
            "clients": len(self._connections),
        })

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self._connections:
            self._connections.remove(websocket)
        logger.info(f"WS client disconnected. Total: {len(self._connections)}")

    async def broadcast(self, data: Any) -> bool:
        """Send a JSON payload to all connected clients. Returns True if anyone received it."""
        if not self._connections:
            return False
        payload = json.dumps(data) if not isinstance(data, str) else data
        dead = []
        for ws in self._connections:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)
        return len(self._connections) > 0

    async def send_to(self, websocket: WebSocket, data: Any) -> None:
        """Send a message to a single client."""
        await websocket.send_json(data)

    @property
    def num_clients(self) -> int:
        return len(self._connections)


# Global singleton
ws_manager = WebSocketManager()
