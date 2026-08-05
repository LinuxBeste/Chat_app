import { describe, it, expect } from "vitest";
import { signAccessToken, signRefreshToken, verifyToken } from "./jwt.js";

describe("JWT", () => {
  const payload = { userId: "550e8400-e29b-41d4-a716-446655440000", username: "testuser" };

  it("signs and verifies an access token", () => {
    const token = signAccessToken(payload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.username).toBe(payload.username);
  });

  it("signs and verifies a refresh token", () => {
    const token = signRefreshToken(payload);
    expect(token).toBeTruthy();

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
  });

  it("rejects an invalid token", () => {
    expect(() => verifyToken("invalid-token")).toThrow();
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken(payload);
    const parts = token.split(".");
    parts[1] = Buffer.from(JSON.stringify({ userId: "hacked" })).toString("base64url");
    const tampered = parts.join(".");
    expect(() => verifyToken(tampered)).toThrow();
  });
});
