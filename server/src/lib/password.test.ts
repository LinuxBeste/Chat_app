import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("MyP@ssw0rd!");
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("MyP@ssw0rd!");

    const valid = await verifyPassword("MyP@ssw0rd!", hash);
    expect(valid).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("correct-password");
    const valid = await verifyPassword("wrong-password", hash);
    expect(valid).toBe(false);
  });
});
