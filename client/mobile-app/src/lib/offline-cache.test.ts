import { describe, it, expect, beforeEach } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cacheGet, cacheSet, cacheRemove, cacheClear, offlineKeys } from "./offline-cache";

describe("offline-cache", () => {
  beforeEach(async () => {
    for (const key of [
      offlineKeys.user,
      offlineKeys.conversations,
      offlineKeys.convInfo("c1"),
      offlineKeys.messages("c1"),
    ]) {
      await cacheRemove(key);
    }
  });

  it("round-trips values", async () => {
    const user = { id: "u1", username: "admin", email: "a@b.c" };
    await cacheSet(offlineKeys.user, user);
    expect(await cacheGet(offlineKeys.user)).toEqual(user);
  });

  it("returns null for missing keys", async () => {
    expect(await cacheGet(offlineKeys.user)).toBeNull();
  });

  it("ignores payloads with a different version", async () => {
    await AsyncStorage.setItem(offlineKeys.user, JSON.stringify({ v: 999, data: { id: "x" } }));
    expect(await cacheGet(offlineKeys.user)).toBeNull();
  });

  it("ignores corrupt payloads", async () => {
    await AsyncStorage.setItem(offlineKeys.user, "not-json");
    expect(await cacheGet(offlineKeys.user)).toBeNull();
  });

  it("removes values", async () => {
    await cacheSet(offlineKeys.conversations, [{ id: "c1" }]);
    await cacheRemove(offlineKeys.conversations);
    expect(await cacheGet(offlineKeys.conversations)).toBeNull();
  });

  it("clears all cached values", async () => {
    await cacheSet(offlineKeys.user, { id: "u1" });
    await cacheSet(offlineKeys.convInfo("c1"), { id: "c1", type: "group", name: "G", members: [], muted: true });
    await AsyncStorage.setItem("@other/settings", "keep-me");
    await cacheClear();
    expect(await cacheGet(offlineKeys.user)).toBeNull();
    expect(await cacheGet(offlineKeys.convInfo("c1"))).toBeNull();
    expect(await AsyncStorage.getItem("@other/settings")).toBe("keep-me");
  });
});
