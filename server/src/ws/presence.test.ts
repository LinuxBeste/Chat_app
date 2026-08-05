import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate, mockSet, mockUpdateWhere, mockSelect, mockLimit } = vi.hoisted(() => {
  const mUpdateWhere = vi.fn();
  const mSet = vi.fn(() => ({ where: mUpdateWhere }));
  const mUpdate = vi.fn(() => ({ set: mSet }));
  const mLimit = vi.fn();
  const mSelectWhere = vi.fn(() => ({ limit: mLimit }));
  const mFrom = vi.fn(() => ({ where: mSelectWhere }));
  const mSelect = vi.fn(() => ({ from: mFrom }));
  return {
    mockUpdate: mUpdate,
    mockSet: mSet,
    mockUpdateWhere: mUpdateWhere,
    mockSelect: mSelect,
    mockLimit: mLimit,
  };
});

vi.mock("../lib/db.js", () => ({
  db: { select: mockSelect, update: mockUpdate },
}));

vi.mock("../lib/redis.js", () => ({
  getRedis: vi.fn(),
}));

import { updatePresence, getPresence } from "./presence.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updatePresence", () => {
  it("sets user status", async () => {
    mockUpdateWhere.mockResolvedValueOnce(undefined);

    await updatePresence("user1", "online");

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith({ status: "online" });
  });

  it("handles db errors", async () => {
    mockUpdateWhere.mockRejectedValueOnce(new Error("db error"));

    await expect(updatePresence("user1", "away")).rejects.toThrow("db error");
  });
});

describe("getPresence", () => {
  it("returns status", async () => {
    mockLimit.mockResolvedValueOnce([{ status: "busy" }]);

    const result = await getPresence("user1");

    expect(result).toBe("busy");
  });

  it("returns offline for unknown user", async () => {
    mockLimit.mockResolvedValueOnce([]);

    const result = await getPresence("unknown");

    expect(result).toBe("offline");
  });

  it("handles db errors", async () => {
    mockLimit.mockRejectedValueOnce(new Error("db error"));

    const result = await getPresence("user1");

    expect(result).toBe("offline");
  });
});
