import { describe, it, expect } from "vitest";
import { isTextFile } from "./file-types";

describe("file-types", () => {
  it("recognizes text mime types", () => {
    expect(isTextFile("text/plain", "notes.txt")).toBe(true);
    expect(isTextFile("text/markdown", "README.md")).toBe(true);
    expect(isTextFile("application/json", "data.json")).toBe(true);
    expect(isTextFile("text/csv", "table.csv")).toBe(true);
    expect(isTextFile("application/x-yaml", "config.yml")).toBe(true);
  });

  it("recognizes text by file extension", () => {
    expect(isTextFile("application/octet-stream", "server.log")).toBe(true);
    expect(isTextFile(undefined, "notes.md")).toBe(true);
    expect(isTextFile(null, "script.py")).toBe(true);
    expect(isTextFile("application/octet-stream", "Dockerfile")).toBe(true);
    expect(isTextFile("application/octet-stream", ".gitignore")).toBe(true);
  });

  it("rejects non-text files", () => {
    expect(isTextFile("image/png", "photo.png")).toBe(false);
    expect(isTextFile("application/pdf", "manual.pdf")).toBe(false);
    expect(isTextFile("video/mp4", "clip.mp4")).toBe(false);
    expect(isTextFile("audio/mpeg", "song.mp3")).toBe(false);
    expect(isTextFile("application/zip", "archive.zip")).toBe(false);
    expect(isTextFile("application/octet-stream", "program.bin")).toBe(false);
    expect(isTextFile(undefined, undefined)).toBe(false);
  });
});
