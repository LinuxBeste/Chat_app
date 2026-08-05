import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { CallOverlay } from "./call-overlay";

const { wsSend, wsHandlers } = vi.hoisted(() => ({
  wsSend: vi.fn(),
  wsHandlers: {} as Record<string, ((data?: any) => void)[]>,
}));

vi.mock("../lib/ws", () => ({
  wsClient: {
    on: vi.fn((type: string, cb: (data?: any) => void) => {
      (wsHandlers[type] ||= []).push(cb);
      return () => {
        wsHandlers[type] = wsHandlers[type].filter((f) => f !== cb);
      };
    }),
    send: wsSend,
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(wsHandlers).forEach((k) => delete wsHandlers[k]);
});

afterEach(() => {
  cleanup();
});

function clickControl(label: string) {
  fireEvent.click(screen.getByText(label).parentElement!.querySelector("button")!);
}

describe("CallOverlay incoming", () => {
  it("shows the call type badge, contact name and Decline/Accept controls", () => {
    render(<CallOverlay conversationId="c1" type="voice" onEnd={vi.fn()} incoming name="Alice" />);
    expect(screen.getByText("Voice Call")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Incoming call")).toBeInTheDocument();
    expect(screen.getByText("Decline")).toBeInTheDocument();
    expect(screen.getByText("Accept")).toBeInTheDocument();
  });

  it("accepting an incoming call switches to the active control row and answers", async () => {
    render(<CallOverlay conversationId="c1" type="voice" onEnd={vi.fn()} incoming name="Alice" />);
    clickControl("Accept");
    await waitFor(() => expect(wsSend).toHaveBeenCalledWith("call:answer", { conversationId: "c1" }));
    expect(screen.getByText("Mute")).toBeInTheDocument();
    expect(screen.getByText("End")).toBeInTheDocument();
    expect(screen.getByText("Speaker")).toBeInTheDocument();
  });

  it("declining an incoming call ends it", () => {
    const onEnd = vi.fn();
    render(<CallOverlay conversationId="c1" type="voice" onEnd={onEnd} incoming name="Alice" />);
    clickControl("Decline");
    expect(wsSend).toHaveBeenCalledWith("call:end", { sessionId: "c1" });
    expect(onEnd).toHaveBeenCalled();
  });

  it("ends the call when call:ended arrives for this session", () => {
    const onEnd = vi.fn();
    render(<CallOverlay conversationId="c1" type="voice" onEnd={onEnd} incoming name="Alice" />);
    wsHandlers["call:ended"][0]({ sessionId: "c1" });
    expect(onEnd).toHaveBeenCalled();
  });
});

describe("CallOverlay active", () => {
  it("mutes and unmutes the microphone", () => {
    render(<CallOverlay conversationId="c1" type="voice" onEnd={vi.fn()} name="Alice" />);
    clickControl("Mute");
    expect(screen.getByText("Unmute")).toBeInTheDocument();
    clickControl("Unmute");
    expect(screen.getByText("Mute")).toBeInTheDocument();
  });

  it("hides the video toggle on voice calls", () => {
    render(<CallOverlay conversationId="c1" type="voice" onEnd={vi.fn()} name="Alice" />);
    expect(screen.queryByText("Video")).not.toBeInTheDocument();
  });

  it("toggles the video feed on video calls", () => {
    render(<CallOverlay conversationId="c1" type="video" onEnd={vi.fn()} name="Alice" />);
    expect(screen.getByText("Video Call")).toBeInTheDocument();
    expect(screen.getByText("Video")).toBeInTheDocument();
    clickControl("Video");
    expect(screen.getByText("Camera Off")).toBeInTheDocument();
  });

  it("toggles the speaker", () => {
    render(<CallOverlay conversationId="c1" type="voice" onEnd={vi.fn()} name="Alice" />);
    clickControl("Speaker");
    expect(screen.getByText("Speaker Off")).toBeInTheDocument();
    clickControl("Speaker Off");
    expect(screen.getByText("Speaker")).toBeInTheDocument();
  });

  it("ends the call and notifies the parent", () => {
    const onEnd = vi.fn();
    render(<CallOverlay conversationId="c1" type="voice" onEnd={onEnd} name="Alice" />);
    clickControl("End");
    expect(wsSend).toHaveBeenCalledWith("call:end", { sessionId: "c1" });
    expect(onEnd).toHaveBeenCalled();
  });

  it("sends a call:offer on mount for outbound calls", async () => {
    render(<CallOverlay conversationId="c1" type="video" onEnd={vi.fn()} name="Bob" />);
    await waitFor(() => expect(wsSend).toHaveBeenCalledWith("call:offer", { conversationId: "c1", type: "video" }));
  });
});
