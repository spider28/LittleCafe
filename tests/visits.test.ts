import { describe, expect, it } from "vitest";
import { shouldTrackPath } from "@/lib/visits";

describe("visit tracking", () => {
  it("tracks public pages", () => {
    expect(shouldTrackPath("/")).toBe(true);
    expect(shouldTrackPath("/pricing")).toBe(true);
    expect(shouldTrackPath("/gallery/photo-day")).toBe(true);
  });

  it("ignores admin, api, framework, and asset paths", () => {
    expect(shouldTrackPath("")).toBe(false);
    expect(shouldTrackPath("https://example.com/pricing")).toBe(false);
    expect(shouldTrackPath("/admin")).toBe(false);
    expect(shouldTrackPath("/admin/visits")).toBe(false);
    expect(shouldTrackPath("/api/visits")).toBe(false);
    expect(shouldTrackPath("/_next/static/app.js")).toBe(false);
    expect(shouldTrackPath("/logo.png")).toBe(false);
  });
});
