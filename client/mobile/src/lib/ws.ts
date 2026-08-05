import { getTokens, refreshAccess } from "./api";

const WS_URL = "ws://10.0.2.2:3000";

type Handler = (data: Record<string, unknown>) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  async connect() {
    let token = (await getTokens()).accessToken;
    if (!token) token = await refreshAccess();
    if (!token) return;

    this.ws = new WebSocket(`${WS_URL}?token=${token}`);

    this.ws.onopen = () => this.emit("_connected", {});
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type) this.emit(data.type as string, data);
      } catch {
        /* ignore */
      }
    };
    this.ws.onclose = () => {
      this.emit("_disconnected", {});
      this.scheduleReconnect();
    };
    this.ws.onerror = () => this.ws?.close();
  }

  private scheduleReconnect() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.connect();
    }, 3000);
  }

  send(type: string, payload: Record<string, unknown> = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type, ...payload }));
  }

  on(type: string, handler: Handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  private emit(type: string, data: Record<string, unknown>) {
    this.handlers.get(type)?.forEach((h) => h(data));
  }

  disconnect() {
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
  }
}

export const wsClient = new WSClient();
