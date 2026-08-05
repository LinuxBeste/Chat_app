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

const EVENT_ID = "e0000000-0000-0000-0000-000000000001";
const CONV_ID = "c0000000-0000-0000-0000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyToken).mockReturnValue({ userId: "u1", username: "test" });
  mockData.current = [];
});

describe("POST /api/events", () => {
  const validBody = {
    conversationId: CONV_ID,
    title: "Test Event",
    description: "A test",
    startsAt: new Date("2026-12-01T12:00:00Z").toISOString(),
    endsAt: new Date("2026-12-01T13:00:00Z").toISOString(),
  };

  it("creates an event", async () => {
    mockData.current = [
      {
        id: EVENT_ID,
        conversationId: CONV_ID,
        createdBy: "u1",
        title: "Test Event",
        description: "A test",
        startsAt: new Date("2026-12-01T12:00:00Z"),
        endsAt: new Date("2026-12-01T13:00:00Z"),
        createdAt: new Date().toISOString(),
      },
    ];
    const res = await request(app).post("/api/events").set("Authorization", "Bearer token").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id", EVENT_ID);
    expect(res.body).toHaveProperty("title", "Test Event");
  });

  it("returns 400 with invalid body", async () => {
    const res = await request(app).post("/api/events").set("Authorization", "Bearer token").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Validation failed");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).post("/api/events").send(validBody);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/events", () => {
  it("lists events", async () => {
    mockData.current = [
      {
        id: EVENT_ID,
        title: "Test Event",
        startsAt: new Date("2026-12-01T12:00:00Z"),
        createdAt: new Date().toISOString(),
      },
    ];
    const res = await request(app).get("/api/events").set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });
});

describe("GET /api/events/:id", () => {
  it("returns event with rsvps", async () => {
    mockData.current = [
      {
        id: EVENT_ID,
        conversationId: CONV_ID,
        createdBy: "u1",
        title: "Test Event",
        startsAt: new Date("2026-12-01T12:00:00Z"),
        createdAt: new Date().toISOString(),
      },
    ];
    const res = await request(app).get(`/api/events/${EVENT_ID}`).set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", EVENT_ID);
    expect(res.body).toHaveProperty("rsvps");
    expect(Array.isArray(res.body.rsvps)).toBe(true);
  });

  it("returns 404 when event not found", async () => {
    const res = await request(app).get("/api/events/nonexistent").set("Authorization", "Bearer token");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error", "Event not found");
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get(`/api/events/${EVENT_ID}`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/events/:id/rsvp", () => {
  it("rsvps with status going", async () => {
    const res = await request(app)
      .post(`/api/events/${EVENT_ID}/rsvp`)
      .set("Authorization", "Bearer token")
      .send({ status: "going" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "RSVP updated");
  });

  it("rsvps with status maybe", async () => {
    const res = await request(app)
      .post(`/api/events/${EVENT_ID}/rsvp`)
      .set("Authorization", "Bearer token")
      .send({ status: "maybe" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "RSVP updated");
  });

  it("rsvps with status declined", async () => {
    const res = await request(app)
      .post(`/api/events/${EVENT_ID}/rsvp`)
      .set("Authorization", "Bearer token")
      .send({ status: "declined" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "RSVP updated");
  });

  it("updates existing rsvp", async () => {
    mockData.current = [{ eventId: EVENT_ID, userId: "u1", status: "maybe" }];
    const res = await request(app)
      .post(`/api/events/${EVENT_ID}/rsvp`)
      .set("Authorization", "Bearer token")
      .send({ status: "going" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "RSVP updated");
  });

  it("returns 400 with invalid status", async () => {
    const res = await request(app)
      .post(`/api/events/${EVENT_ID}/rsvp`)
      .set("Authorization", "Bearer token")
      .send({ status: "invalid" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "Validation failed");
  });
});
