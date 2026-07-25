import { describe, expect, it } from "vitest";
import { isLocalVisitHost, recordWebsiteVisitFromRequest, shouldTrackPath } from "@/lib/visits";

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

  it("recognizes local development hosts", () => {
    expect(isLocalVisitHost("localhost")).toBe(true);
    expect(isLocalVisitHost("localhost:3000")).toBe(true);
    expect(isLocalVisitHost("app.localhost:3000")).toBe(true);
    expect(isLocalVisitHost("127.0.0.1:3000")).toBe(true);
    expect(isLocalVisitHost("[::1]:3000")).toBe(true);
    expect(isLocalVisitHost("little-cafe.vercel.app")).toBe(false);
  });

  it("does not record local development visits", async () => {
    await expect(recordWebsiteVisitFromRequest(new Headers({ host: "localhost:3000" }), { path: "/" })).resolves.toEqual({
      recorded: false,
      reason: "ignored-local-visit"
    });

    await expect(
      recordWebsiteVisitFromRequest(new Headers({ host: "little-cafe.vercel.app", "x-forwarded-for": "127.0.0.1" }), { path: "/" })
    ).resolves.toEqual({
      recorded: false,
      reason: "ignored-local-visit"
    });
  });
});
