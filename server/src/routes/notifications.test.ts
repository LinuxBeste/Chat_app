import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { verifyToken } from "../lib/jwt.js";

const { mockData } = vi.hoisted(() => ({ mockData: { current: [] as any[] } }));

vi.mock("../lib/db.js", () => {
  const chain: any = {
    then: (resolve: any) => Promise.resolve(mockData.current).then(resolve),
    catch: (reject: any) => Promise.resolve(mockData.current).catch(reject),
    finally: (handler: any) => Promise.resolve(mockData.current).finally(handler),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    onConflictDoNothing: vi.fn(() => Promise.resolve(undefined)),
  };
  return {
    db: {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    },
  };
});

vi.mock("../lib/jwt.js", () => ({ verifyToken: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyToken).mockReturnValue({ userId: "u1", username: "test" });
  mockData.current = [];
});

describe("GET /api/notifications", () => {
  it("returns notifications list", async () => {
    mockData.current = [
      {
        id: "n1",
        userId: "u1",
        type: "message",
        title: "New msg",
        isRead: "false",
        createdAt: new Date().toISOString(),
      },
    ];
    const res = await request(app).get("/api/notifications").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it("returns empty array when no notifications", async () => {
    const res = await request(app).get("/api/notifications").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("respects limit query parameter", async () => {
    mockData.current = Array.from({ length: 5 }, (_, i) => ({
      id: `n${i}`,
      userId: "u1",
      type: "message",
      title: `msg${i}`,
      isRead: "false",
      createdAt: new Date().toISOString(),
    }));
    const res = await request(app).get("/api/notifications?limit=3").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/notifications/unread-count", () => {
  it("returns unread count", async () => {
    mockData.current = [{ count: 3 }];
    const res = await request(app).get("/api/notifications/unread-count").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("count");
    expect(res.body.count).toBe(3);
  });

  it("returns zero when nothing unread", async () => {
    mockData.current = [{ count: 0 }];
    const res = await request(app).get("/api/notifications/unread-count").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/notifications/unread-count");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/notifications/:id/read", () => {
  it("marks notification as read", async () => {
    const res = await request(app).post("/api/notifications/n1/read").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Marked as read");
  });

  it("marks already-read notification idempotently", async () => {
    const res = await request(app).post("/api/notifications/n1/read").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Marked as read");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/notifications/n1/read");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/notifications/read-all", () => {
  it("marks all notifications as read", async () => {
    const res = await request(app).post("/api/notifications/read-all").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "All marked as read");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/notifications/read-all");
    expect(res.status).toBe(401);
  });
});
