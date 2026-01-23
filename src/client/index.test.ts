import { describe, it, expect } from "vitest";
import { parseVersionId, parseAssetPath, corsHeaders } from "./index";

describe("parseVersionId", () => {
  it("extracts versionId from simple path", () => {
    expect(parseVersionId("/assets/v/abc123")).toBe("abc123");
  });

  it("extracts versionId when filename follows", () => {
    expect(parseVersionId("/assets/v/abc123/image.png")).toBe("abc123");
  });

  it("extracts versionId with nested path after", () => {
    expect(parseVersionId("/assets/v/version123/path/to/file.txt")).toBe(
      "version123",
    );
  });

  it("works with custom prefix", () => {
    expect(parseVersionId("/api/files/v/ver456")).toBe("ver456");
  });

  it("works with deep prefix", () => {
    expect(parseVersionId("/api/v1/assets/v/ver789/doc.pdf")).toBe("ver789");
  });

  it("returns null when /v/ marker is missing", () => {
    expect(parseVersionId("/assets/abc123/file.txt")).toBeNull();
  });

  it("returns null when versionId is empty", () => {
    expect(parseVersionId("/assets/v/")).toBeNull();
  });

  it("returns null when path ends at /v", () => {
    expect(parseVersionId("/assets/v")).toBeNull();
  });

  it("returns null for empty pathname", () => {
    expect(parseVersionId("")).toBeNull();
  });

  it("handles versionId with special characters", () => {
    expect(parseVersionId("/assets/v/k57abc123def456")).toBe("k57abc123def456");
  });

  it("uses first /v/ if multiple exist", () => {
    // Edge case: if someone has /v/ in their prefix, we use the first /v/
    expect(parseVersionId("/v/first/v/second")).toBe("first");
  });
});

describe("parseAssetPath", () => {
  const DEFAULT_PREFIX = "/assets";

  it("extracts basename from root path", () => {
    const result = parseAssetPath("/assets/file.txt", DEFAULT_PREFIX);
    expect(result).toEqual({ folderPath: "", basename: "file.txt" });
  });

  it("extracts folderPath and basename from nested path", () => {
    const result = parseAssetPath("/assets/images/photo.png", DEFAULT_PREFIX);
    expect(result).toEqual({ folderPath: "images", basename: "photo.png" });
  });

  it("handles deeply nested paths", () => {
    const result = parseAssetPath("/assets/a/b/c/d/file.txt", DEFAULT_PREFIX);
    expect(result).toEqual({ folderPath: "a/b/c/d", basename: "file.txt" });
  });

  it("works with custom prefix", () => {
    const result = parseAssetPath("/api/files/docs/readme.md", "/api/files");
    expect(result).toEqual({ folderPath: "docs", basename: "readme.md" });
  });

  it("returns null for empty path after prefix", () => {
    expect(parseAssetPath("/assets/", DEFAULT_PREFIX)).toBeNull();
  });

  it("returns null when only prefix provided", () => {
    expect(parseAssetPath("/assets", DEFAULT_PREFIX)).toBeNull();
  });

  it("handles trailing slashes in path", () => {
    // The filter(Boolean) removes empty segments from trailing slash
    const result = parseAssetPath("/assets/folder/file.txt/", DEFAULT_PREFIX);
    expect(result).toEqual({ folderPath: "folder", basename: "file.txt" });
  });

  it("handles multiple consecutive slashes", () => {
    const result = parseAssetPath("/assets//folder//file.txt", DEFAULT_PREFIX);
    expect(result).toEqual({ folderPath: "folder", basename: "file.txt" });
  });
});

describe("corsHeaders", () => {
  it("has correct Access-Control-Allow-Origin", () => {
    expect(corsHeaders["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("allows GET and OPTIONS methods", () => {
    expect(corsHeaders["Access-Control-Allow-Methods"]).toBe("GET, OPTIONS");
  });

  it("allows Content-Type header", () => {
    expect(corsHeaders["Access-Control-Allow-Headers"]).toBe("Content-Type");
  });
});
