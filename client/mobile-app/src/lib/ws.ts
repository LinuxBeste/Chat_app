import { getTokens, refreshAccess } from "./api";
import { getServerWsUrl } from "./server-config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HEARTBEAT_INTERVAL = 25000;
const HEARTBEAT_TIMEOUT = 10000;
const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;
const PENDING_KEY = "@cache/pending-messages";

type MessageHandler = (data: Record<string, unknown>) => void;

interface PendingMessage {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

async function loadPending(): Promise<PendingMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePending(pending: PendingMessage[]) {
  try {
    AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending.slice(-200)));
  } catch {}
}

class WSClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private authenticated = false;
  private reconnectAttempts = 0;
  private intentionalClose = false;
  private pending: PendingMessage[] = [];
  private static readonly MAX_PENDING = 100;

  async connect() {
    const refreshed = await refreshAccess();
    let token = refreshed ?? (await getTokens()).accessToken;
    if (!token) return;

    const saved = await loadPending();
    if (saved.length > 0) {
      const savedIds = new Set(saved.map((m) => m.id));
      this.pending = [...saved, ...this.pending.filter((m) => !savedIds.has(m.id))].slice(-WSClient.MAX_PENDING);
    }

    try {
      this.ws = new WebSocket(await getServerWsUrl());
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "auth", token }));
        } catch {}
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") {
          this.authenticated = true;
          this.reconnectAttempts = 0;
          this.flushPending();
          this.emit("_connected", data);
          this.startHeartbeat();
        } else if (data.type === "error" && data.error === "Authentication required") {
          this.authenticated = false;
          this.connected = false;
          this.emit("_auth_error", data);
          this.ws?.close();
        } else if (data.type === "pong") {
          this.resetHeartbeatTimeout();
        } else if (data.type) {
          this.emit(data.type as string, data);
        }
      } catch {}
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.authenticated = false;
      this.stopHeartbeat();
      this.emit("_disconnected", {});
      if (!this.intentionalClose) this.scheduleReconnect();
    };

    this.ws.onerror = () => this.ws?.close();
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "ping" }));
        } catch {}
        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.ws?.close();
        }, HEARTBEAT_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  }

  private resetHeartbeatTimeout() {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.resetHeartbeatTimeout();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay =
      Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts), MAX_RECONNECT_DELAY) +
      Math.random() * 1000;
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  send(type: string, payload: Record<string, unknown> = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.authenticated) {
      if (type !== "typing:indicator" && this.pending.length < WSClient.MAX_PENDING) {
        const msg: PendingMessage = {
          id: (payload.id as string) || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type,
          payload,
          createdAt: new Date().toISOString(),
        };
        this.pending.push(msg);
        savePending(this.pending);
      }
      return;
    }
    try {
      this.ws.send(JSON.stringify({ type, ...payload }));
    } catch {}
  }

  private flushPending() {
    while (this.pending.length > 0) {
      const msg = this.pending[0];
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.authenticated) break;
      try {
        this.ws.send(JSON.stringify({ type: msg.type, ...msg.payload }));
        this.pending.shift();
      } catch {
        break;
      }
    }
    savePending(this.pending);
  }

  on(type: string, handler: MessageHandler) {
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
    this.intentionalClose = true;
    savePending(this.pending);
    this.pending = [];
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.authenticated = false;
    this.reconnectAttempts = 0;
  }

  isConnected() {
    return this.connected && this.authenticated;
  }
}

export const wsClient = new WSClient();
