import { describe, it, expect } from "vitest";
import { AppError } from "./app-error.js";

describe("AppError", () => {
  it("creates an error with status, code, and message", () => {
    const err = new AppError(400, "VALIDATION", "Invalid input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION");
    expect(err.message).toBe("Invalid input");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it("optionally includes details", () => {
    const details = { field: "email", reason: "already taken" };
    const err = new AppError(409, "CONFLICT", "Duplicate", details);
    expect(err.details).toEqual(details);
  });

  it("preserves stack trace", () => {
    const err = new AppError(500, "ERR", "test");
    expect(err.stack).toBeTruthy();
  });

  it("AppError without details works", () => {
    const err = new AppError(400, "VALIDATION", "Invalid input");
    expect(err.details).toBeUndefined();
  });

  it("AppError with status 500 has correct code", () => {
    const err = new AppError(500, "SERVER_ERROR", "Something went wrong");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("SERVER_ERROR");
  });
});
