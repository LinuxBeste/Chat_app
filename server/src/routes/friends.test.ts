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

const USER_ID = "00000000-0000-0000-0000-000000000001";
const FRIEND_ID = "00000000-0000-0000-0000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyToken).mockReturnValue({ userId: USER_ID, username: "test" });
  mockData.current = [];
});

describe("POST /api/friends/requests", () => {
  const validBody = { friendId: FRIEND_ID };

  it("sends a friend request", async () => {
    const res = await request(app).post("/api/friends/requests").set("Authorization", "Bearer token").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message", "Friend request sent");
  });

  it("returns 400 with invalid body", async () => {
    const res = await request(app).post("/api/friends/requests").set("Authorization", "Bearer token").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when friending self", async () => {
    const res = await request(app)
      .post("/api/friends/requests")
      .set("Authorization", "Bearer token")
      .send({ friendId: USER_ID });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Cannot friend yourself");
  });

  it("returns 409 when duplicate request exists", async () => {
    mockData.current = [{ id: "existing" }];
    const res = await request(app).post("/api/friends/requests").set("Authorization", "Bearer token").send(validBody);
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error", "Friend request already exists");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/friends/requests").send(validBody);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/friends/requests/:id/accept", () => {
  it("accepts a friend request", async () => {
    mockData.current = [{ userId: FRIEND_ID, friendId: USER_ID, status: "accepted" }];
    const res = await request(app)
      .post(`/api/friends/requests/${FRIEND_ID}/accept`)
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Friend request accepted");
  });

  it("returns 404 when no pending request", async () => {
    const res = await request(app)
      .post(`/api/friends/requests/${FRIEND_ID}/accept`)
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "No pending request found");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post(`/api/friends/requests/${FRIEND_ID}/accept`);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/friends", () => {
  it("lists friends", async () => {
    mockData.current = [
      {
        id: FRIEND_ID,
        username: "friend",
        displayName: null,
        avatar: null,
        status: "online",
        status_: "accepted",
        createdAt: new Date().toISOString(),
      },
    ];
    const res = await request(app).get("/api/friends").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/friends");
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/friends/:friendId", () => {
  it("removes a friend", async () => {
    const res = await request(app).delete(`/api/friends/${FRIEND_ID}`).set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Friend removed");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).delete(`/api/friends/${FRIEND_ID}`);
    expect(res.status).toBe(401);
  });
});
