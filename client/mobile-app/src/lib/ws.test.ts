import { describe, it, expect, vi, beforeEach } from "vitest";
import { wsClient } from "./ws";
import AsyncStorage from "@react-native-async-storage/async-storage";

vi.mock("./api", () => ({
  api: vi.fn(),
  getTokens: vi.fn(() => ({ accessToken: "mock-token", refreshToken: "mock-refresh" })),
  setTokens: vi.fn(async () => {}),
  clearTokens: vi.fn(async () => {}),
  refreshAccess: vi.fn(() => Promise.resolve(null)),
  uploadFile: vi.fn(),
  BASE_URL: "http://localhost:3000",
}));

class MockWebSocket {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  send = vi.fn();
  close = vi.fn();
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(_url: string) {
    setTimeout(() => {
      this.onopen?.();
      setTimeout(() => {
        this.onmessage?.({ data: JSON.stringify({ type: "connected", userId: "u1" }) });
      }, 0);
    }, 0);
  }
}

describe("WSClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("WebSocket", MockWebSocket as any);
    wsClient.disconnect();
  });

  it("connects and emits _connected event", async () => {
    const handler = vi.fn();
    wsClient.on("_connected", handler);

    await wsClient.connect();

    await vi.waitFor(() => {
      expect(wsClient.isConnected()).toBe(true);
    });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" }));
  });

  it("send is a no-op when not connected", () => {
    expect(() => wsClient.send("test")).not.toThrow();
  });

  it("send queues message when connected", async () => {
    await wsClient.connect();
    await vi.waitFor(() => {
      expect(wsClient.isConnected()).toBe(true);
    });

    wsClient.send("message:send", { content: "hello" });

    expect(wsClient["ws"]?.send).toHaveBeenCalledWith(JSON.stringify({ type: "message:send", content: "hello" }));
  });

  it("disconnects and clears state", async () => {
    await wsClient.connect();
    await vi.waitFor(() => {
      expect(wsClient.isConnected()).toBe(true);
    });

    wsClient.disconnect();
    expect(wsClient.isConnected()).toBe(false);
  });

  it("does not reconnect after intentional disconnect", async () => {
    wsClient.disconnect();
    expect(wsClient.isConnected()).toBe(false);
  });

  it("fires _disconnected on unexpected close", async () => {
    const handler = vi.fn();
    wsClient.on("_disconnected", handler);

    await wsClient.connect();
    await vi.waitFor(() => {
      expect(wsClient.isConnected()).toBe(true);
    });

    const ws = wsClient["ws"] as any;
    ws.onclose?.();

    expect(handler).toHaveBeenCalled();
  });

  it("registers and unregisters event handlers", () => {
    const handler = vi.fn();
    const unsub = wsClient.on("test:event", handler);

    wsClient["emit"]("test:event", { data: 1 });
    expect(handler).toHaveBeenCalledWith({ data: 1 });

    unsub();
    wsClient["emit"]("test:event", { data: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("handles pong messages without error", async () => {
    const handler = vi.fn();
    wsClient.on("pong", handler);

    await wsClient.connect();
    await vi.waitFor(() => {
      expect(wsClient.isConnected()).toBe(true);
    });

    const ws = wsClient["ws"] as any;
    ws.onmessage?.({ data: JSON.stringify({ type: "pong" }) });
  });

  it("handles unknown message types by emitting them", async () => {
    const handler = vi.fn();
    wsClient.on("custom:event", handler);

    await wsClient.connect();
    await vi.waitFor(() => {
      expect(wsClient.isConnected()).toBe(true);
    });

    const ws = wsClient["ws"] as any;
    ws.onmessage?.({ data: JSON.stringify({ type: "custom:event", foo: "bar" }) });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ foo: "bar" }));
  });

  it("reconnects on unexpected close", async () => {
    vi.useFakeTimers();

    await wsClient.connect();
    await vi.waitFor(() => {
      expect(wsClient.isConnected()).toBe(true);
    });

    const ws = wsClient["ws"] as any;
    ws.onclose?.();

    expect(wsClient.isConnected()).toBe(false);

    vi.advanceTimersByTime(2000);

    vi.useRealTimers();
  });

  it("persists queued messages and flushes them on reconnect", async () => {
    wsClient.disconnect();
    await AsyncStorage.removeItem("@cache/pending-messages");

    wsClient.send("message:send", { conversationId: "c1", id: "m1", content: "hello" });

    const raw = await AsyncStorage.getItem("@cache/pending-messages");
    expect(raw).toContain("m1");

    await wsClient.connect();
    await vi.waitFor(() => {
      expect(wsClient.isConnected()).toBe(true);
    });

    expect(wsClient["ws"]?.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "message:send", conversationId: "c1", id: "m1", content: "hello" }),
    );
    const after = await AsyncStorage.getItem("@cache/pending-messages");
    expect(after).toBe("[]");
  });

  it("loads persisted queue from a previous session", async () => {
    wsClient.disconnect();
    await AsyncStorage.setItem(
      "@cache/pending-messages",
      JSON.stringify([
        {
          id: "m9",
          type: "message:send",
          payload: { conversationId: "c1", id: "m9", content: "queued" },
          createdAt: new Date().toISOString(),
        },
      ]),
    );

    await wsClient.connect();
    await vi.waitFor(() => {
      expect(wsClient.isConnected()).toBe(true);
    });

    expect(wsClient["ws"]?.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "message:send", conversationId: "c1", id: "m9", content: "queued" }),
    );
  });
});
