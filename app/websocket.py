import json
import logging
from collections import defaultdict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # project_id -> list of (websocket, user_info)
        self._connections: dict[int, list[tuple[WebSocket, dict]]] = defaultdict(list)

    async def connect(self, project_id: int, websocket: WebSocket, user_info: dict):
        await websocket.accept()
        self._connections[project_id].append((websocket, user_info))
        await self._broadcast_presence(project_id)

    def disconnect(self, project_id: int, websocket: WebSocket):
        self._connections[project_id] = [
            (ws, info) for ws, info in self._connections[project_id] if ws is not websocket
        ]
        if not self._connections[project_id]:
            del self._connections[project_id]

    async def broadcast_presence_after_disconnect(self, project_id: int):
        if project_id in self._connections:
            await self._broadcast_presence(project_id)

    def get_presence(self, project_id: int) -> list[dict]:
        seen = set()
        result = []
        for _, info in self._connections.get(project_id, []):
            if info["user_id"] not in seen:
                seen.add(info["user_id"])
                result.append(info)
        return result

    async def broadcast(self, project_id: int, event: dict, exclude_ws: WebSocket | None = None):
        dead = []
        for ws, _ in self._connections.get(project_id, []):
            if ws is exclude_ws:
                continue
            try:
                await ws.send_text(json.dumps(event))
            except Exception:
                dead.append(ws)
        # Clean up dead connections
        if dead:
            self._connections[project_id] = [
                (ws, info) for ws, info in self._connections[project_id] if ws not in dead
            ]

    async def _broadcast_presence(self, project_id: int):
        presence = self.get_presence(project_id)
        await self.broadcast(project_id, {"type": "presence", "users": presence})


manager = ConnectionManager()
