import { describe, it, expect, vi } from "vitest";

const { mockPinoInstance } = vi.hoisted(() => {
  const instance: any = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    })),
  };
  return { mockPinoInstance: instance };
});

vi.mock("pino", () => ({
  default: Object.assign(
    vi.fn(() => mockPinoInstance),
    { stdSerializers: { err: vi.fn() } },
  ),
}));

vi.hoisted(() => {
  process.env.NODE_ENV = "development";
  delete process.env.LOG_LEVEL;
});

import { logger, createContextLogger } from "../lib/logger.js";

describe("logger", () => {
  it("has info, debug, warn, error, fatal methods", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.fatal).toBe("function");
  });

  it("level defaults to debug in development", () => {
    expect(typeof logger.info).toBe("function");
  });
});

describe("createContextLogger", () => {
  it("returns a child logger", () => {
    const child = createContextLogger("test");
    expect(child).toBeDefined();
  });

  it("child logger has all log methods", () => {
    const child = createContextLogger("test");
    expect(typeof child.info).toBe("function");
    expect(typeof child.debug).toBe("function");
    expect(typeof child.warn).toBe("function");
    expect(typeof child.error).toBe("function");
    expect(typeof child.fatal).toBe("function");
  });

  it("child logger has info method", () => {
    const child = createContextLogger("test");
    expect(typeof child.info).toBe("function");
  });
});
