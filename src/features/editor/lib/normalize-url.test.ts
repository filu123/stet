import { describe, expect, it } from "vitest";

import { normalizeUrl } from "./normalize-url";

describe("normalizeUrl", () => {
  it("adds https:// when no scheme is present", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("example.com/docs?q=1")).toBe("https://example.com/docs?q=1");
  });

  it("keeps existing http/https schemes", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("allows mailto and tel", () => {
    expect(normalizeUrl("mailto:hi@example.com")).toBe("mailto:hi@example.com");
    expect(normalizeUrl("tel:+15551234")).toBe("tel:+15551234");
  });

  it("rejects dangerous schemes", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("data:text/html,<script>")).toBeNull();
    expect(normalizeUrl("  JavaScript:alert(1)  ")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(normalizeUrl("")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com");
  });
});
