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
    innerJoin: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
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
      query: {
        conversations: { findFirst: vi.fn(() => Promise.resolve(undefined)) },
      },
    },
  };
});

vi.mock("../lib/jwt.js", () => ({ verifyToken: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyToken).mockReturnValue({ userId: "00000000-0000-0000-0000-000000000001", username: "test" });
  mockData.current = [];
});

describe("GET /api/users/me", () => {
  it("returns current user", async () => {
    mockData.current = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        username: "test",
        email: "test@test.com",
        displayName: "Test",
        avatar: null,
        bio: "hi",
        customStatus: null,
        status: "online",
        createdAt: new Date().toISOString(),
      },
    ];
    const res = await request(app).get("/api/users/me").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", "00000000-0000-0000-0000-000000000001");
    expect(res.body).toHaveProperty("username", "test");
  });

  it("returns 404 when user not found", async () => {
    const res = await request(app).get("/api/users/me").set("Authorization", "Bearer token");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "User not found");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/users/me", () => {
  it("updates displayName", async () => {
    mockData.current = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        username: "test",
        displayName: "NewName",
        avatar: null,
        bio: null,
        customStatus: null,
        status: "online",
      },
    ];
    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", "Bearer token")
      .send({ displayName: "NewName" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("displayName", "NewName");
  });

  it("updates bio", async () => {
    mockData.current = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        username: "test",
        displayName: null,
        avatar: null,
        bio: "My bio",
        customStatus: null,
        status: "online",
      },
    ];
    const res = await request(app).put("/api/users/me").set("Authorization", "Bearer token").send({ bio: "My bio" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("bio", "My bio");
  });

  it("updates customStatus", async () => {
    mockData.current = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        username: "test",
        displayName: null,
        avatar: null,
        bio: null,
        customStatus: "Busy",
        status: "online",
      },
    ];
    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", "Bearer token")
      .send({ customStatus: "Busy" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("customStatus", "Busy");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).put("/api/users/me").send({ displayName: "NewName" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/users/search", () => {
  it("searches users with query", async () => {
    mockData.current = [
      {
        id: "00000000-0000-0000-0000-000000000002",
        username: "testuser",
        displayName: "Test",
        avatar: null,
        status: "online",
      },
    ];
    const res = await request(app).get("/api/users/search").query({ q: "test" }).set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it("returns 400 for empty query", async () => {
    const res = await request(app).get("/api/users/search").query({ q: "" }).set("Authorization", "Bearer token");
    expect(res.status).toBe(400);
  });

  it("returns empty array for no matches", async () => {
    const res = await request(app).get("/api/users/search").query({ q: "abc" }).set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/users/:id", () => {
  it("returns user by id", async () => {
    mockData.current = [
      {
        id: "00000000-0000-0000-0000-000000000002",
        username: "other",
        displayName: "Other",
        avatar: null,
        status: "offline",
      },
    ];
    const res = await request(app)
      .get("/api/users/00000000-0000-0000-0000-000000000002")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", "00000000-0000-0000-0000-000000000002");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/api/users/unknown").set("Authorization", "Bearer token");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "User not found");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/users/00000000-0000-0000-0000-000000000002");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/users/me/stats", () => {
  it("returns 404 (route not found)", async () => {
    const res = await request(app).get("/api/users/me/stats").set("Authorization", "Bearer token");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/users/me with invalid body", () => {
  it("returns 400 for malformed JSON", async () => {
    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", "Bearer token")
      .set("Content-Type", "application/json")
      .send("not valid json");
    expect(res.status).toBe(400);
  });
});
