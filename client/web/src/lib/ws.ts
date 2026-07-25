import { getTokens, refreshAccess } from "./api"
import { addPendingMessage, getPendingMessages, clearPendingMessages } from "./offline"

const BASE_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3000"
const HEARTBEAT_INTERVAL = 25000
const HEARTBEAT_TIMEOUT = 10000
const MAX_RECONNECT_DELAY = 30000
const INITIAL_RECONNECT_DELAY = 1000

type MessageHandler = (data: Record<string, unknown>) => void

interface PendingMessage {
  type: string
  payload: Record<string, unknown>
}

class WSClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<MessageHandler>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private connected = false
  private authenticated = false
  private reconnectAttempts = 0
  private pendingMessages: PendingMessage[] = []
  private intentionalClose = false

  async connect() {
    const refreshed = await refreshAccess()
    let token = refreshed ?? getTokens().accessToken
    if (!token) return

    const savedQueue = getPendingMessages()
    if (savedQueue.length > 0) {
      this.pendingMessages = savedQueue
      clearPendingMessages()
    }

    this.ws = new WebSocket(BASE_URL)

    this.ws.onopen = () => {
      this.connected = true
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "auth", token }))
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "connected") {
          this.authenticated = true
          this.reconnectAttempts = 0
          this.emit("_connected", data)
          this.drainQueue()
          this.startHeartbeat()
        } else if (data.type === "error" && data.error === "Authentication required") {
          this.authenticated = false
          this.connected = false
          this.emit("_auth_error", data)
          this.ws?.close()
        } else if (data.type === "pong") {
          this.resetHeartbeatTimeout()
        } else if (data.type) {
          this.emit(data.type as string, data)
        }
      } catch {
        /* ignore malformed */
      }
    }

    this.ws.onclose = () => {
      this.connected = false
      this.authenticated = false
      this.stopHeartbeat()
      this.emit("_disconnected", {})
      if (!this.intentionalClose) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      console.error("[WS] connection error")
      this.ws?.close()
    }
  }

  private drainQueue() {
    const queue = this.pendingMessages
    this.pendingMessages = []
    for (const msg of queue) {
      this.send(msg.type, msg.payload)
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }))
        this.heartbeatTimeoutTimer = setTimeout(() => {
          console.warn("[WS] heartbeat timeout, closing")
          this.ws?.close()
        }, HEARTBEAT_TIMEOUT)
      }
    }, HEARTBEAT_INTERVAL)
  }

  private resetHeartbeatTimeout() {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.resetHeartbeatTimeout()
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY,
    ) + Math.random() * 1000
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  send(type: string, payload: Record<string, unknown> = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.authenticated) {
      this.pendingMessages.push({ type, payload })
      addPendingMessage({
        id: payload.id as string || crypto.randomUUID(),
        conversationId: payload.conversationId as string,
        type: type as "message:send",
        payload,
        createdAt: new Date().toISOString(),
      })
      return
    }
    this.ws.send(JSON.stringify({ type, ...payload }))
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(handler)
    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  private emit(type: string, data: Record<string, unknown>) {
    this.handlers.get(type)?.forEach((h) => h(data))
  }

  disconnect() {
    this.intentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopHeartbeat()

    if (this.pendingMessages.length > 0) {
      for (const msg of this.pendingMessages) {
        addPendingMessage({
          id: crypto.randomUUID(),
          conversationId: "",
          type: "message:send",
          payload: msg.payload,
          createdAt: new Date().toISOString(),
        })
      }
      this.pendingMessages = []
    }

    this.ws?.close()
    this.ws = null
    this.connected = false
    this.authenticated = false
    this.reconnectAttempts = 0
  }

  isConnected() {
    return this.connected && this.authenticated
  }
}

export const wsClient = new WSClient()
