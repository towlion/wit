import { useEffect, useRef, useState, useCallback } from "react";

interface PresenceUser {
  user_id: number;
  display_name: string;
}

interface BoardEvent {
  type: string;
  item_number?: number;
  users?: PresenceUser[];
}

export function useBoardSocket(
  projectId: number | null,
  onEvent: (event: BoardEvent) => void,
) {
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!projectId) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/board/${projectId}?token=${token}`);

    ws.onmessage = (e) => {
      try {
        const data: BoardEvent = JSON.parse(e.data);
        if (data.type === "presence" && data.users) {
          setPresence(data.users);
        } else {
          onEventRef.current(data);
        }
      } catch {
        /* Malformed WebSocket message — silent to avoid toast spam on reconnection */
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [projectId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
      setPresence([]);
    };
  }, [connect]);

  return { presence };
}
