import { getTokens, refreshAccess } from "./api"

const BASE_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3000"

type MessageHandler = (data: Record<string, unknown>) => void

class WSClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<MessageHandler>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connected = false

  async connect() {
    let token = getTokens().accessToken
    if (!token) {
      token = await refreshAccess()
    }
    if (!token) return

    this.ws = new WebSocket(`${BASE_URL}?token=${token}`)

    this.ws.onopen = () => {
      this.connected = true
      this.emit("_connected", {})
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type) {
          this.emit(data.type as string, data)
        }
      } catch { /* ignore malformed */ }
    }

    this.ws.onclose = () => {
      this.connected = false
      this.emit("_disconnected", {})
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 3000)
  }

  send(type: string, payload: Record<string, unknown> = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ type, ...payload }))
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(handler)
    return () => { this.handlers.get(type)?.delete(handler) }
  }

  private emit(type: string, data: Record<string, unknown>) {
    this.handlers.get(type)?.forEach((h) => h(data))
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
    this.connected = false
  }

  isConnected() {
    return this.connected
  }
}

export const wsClient = new WSClient()
