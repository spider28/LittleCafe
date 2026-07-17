import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn((): unknown => null),
  createSupabaseServerClient: vi.fn(async (): Promise<unknown> => null)
}));

vi.mock("next/cache", () => ({ unstable_noStore: vi.fn() }));
vi.mock("@/lib/supabase", () => supabaseMocks);

import { getWebsiteVisits, type WebsiteVisit } from "@/lib/visits";

function visit(overrides: Partial<WebsiteVisit> = {}): WebsiteVisit {
  return {
    id: "visit-1",
    visited_at: "2026-07-17T01:36:20.000Z",
    path: "/",
    search: null,
    referrer: null,
    host: "little-cafe.vercel.app",
    ip_address: "203.0.113.10",
    country: "US",
    region: "IL",
    city: "Chicago",
    user_agent: "test browser",
    browser: "Chrome",
    os: "Linux",
    device_type: "desktop",
    is_bot: false,
    ...overrides
  };
}

describe("website visit data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.createSupabaseAdminClient.mockReturnValue(null);
  });

  it("loads visits with the server-only admin client", async () => {
    const rows = [visit(), visit({ id: "visit-2", path: "/pricing", ip_address: "203.0.113.10", is_bot: true })];
    const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    supabaseMocks.createSupabaseAdminClient.mockReturnValue({ from });

    const result = await getWebsiteVisits();

    expect(supabaseMocks.createSupabaseAdminClient).toHaveBeenCalledOnce();
    expect(supabaseMocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("website_visits");
    expect(result.visits).toEqual(rows);
    expect(result.warning).toBeNull();
    expect(result.summary).toEqual({
      total: 2,
      uniqueIps: 1,
      bots: 1,
      topPaths: [
        { path: "/", count: 1 },
        { path: "/pricing", count: 1 }
      ]
    });
  });

  it("falls back to the authenticated client when the service-role key is not configured", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    supabaseMocks.createSupabaseServerClient.mockResolvedValue({ from });

    const result = await getWebsiteVisits();

    expect(supabaseMocks.createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(result.visits).toEqual([]);
    expect(result.warning).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("does not turn database errors into an empty dashboard", async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    supabaseMocks.createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => ({ select })) });

    const result = await getWebsiteVisits();

    expect(result.visits).toEqual([]);
    expect(result.warning).toContain("could not be loaded");
  });
});
