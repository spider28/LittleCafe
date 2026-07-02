import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseAdminClient, createSupabaseServerClient } from "./supabase";

export type WebsiteVisit = {
  id: string;
  visited_at: string;
  path: string;
  search: string | null;
  referrer: string | null;
  host: string | null;
  ip_address: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  is_bot: boolean;
};

export type WebsiteVisitSummary = {
  total: number;
  uniqueIps: number;
  bots: number;
  topPaths: Array<{ path: string; count: number }>;
};

const ignoredPathPrefixes = ["/admin", "/api", "/_next"];
const ignoredExtensions = /\.(?:css|js|map|ico|png|jpg|jpeg|gif|webp|svg|txt|xml|json|woff2?)$/i;

export function shouldTrackPath(path: string) {
  return Boolean(path && !ignoredPathPrefixes.some((prefix) => path.startsWith(prefix)) && !ignoredExtensions.test(path));
}

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function cleanIpAddress(ip: string | null) {
  if (!ip) {
    return null;
  }

  const normalized = ip.replace(/^::ffff:/, "");
  if (normalized === "::1") {
    return "127.0.0.1";
  }

  return normalized;
}

function parseUserAgent(userAgent: string | null) {
  const ua = userAgent ?? "";
  const isBot = /\b(bot|crawler|spider|crawling|preview|slurp|bing|googlebot|duckduckbot|baiduspider|yandex)\b/i.test(ua);
  const deviceType = /mobile|iphone|android/i.test(ua) ? "mobile" : /ipad|tablet/i.test(ua) ? "tablet" : "desktop";
  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /chrome|crios/i.test(ua)
      ? "Chrome"
      : /firefox|fxios/i.test(ua)
        ? "Firefox"
        : /safari/i.test(ua)
          ? "Safari"
          : userAgent
            ? "Other"
            : null;
  const os = /windows/i.test(ua)
    ? "Windows"
    : /mac os|macintosh/i.test(ua)
      ? "macOS"
      : /iphone|ipad|ios/i.test(ua)
        ? "iOS"
        : /android/i.test(ua)
          ? "Android"
          : /linux/i.test(ua)
            ? "Linux"
            : userAgent
              ? "Other"
              : null;

  return { browser, os, deviceType, isBot };
}

export async function recordWebsiteVisit(headers: Headers) {
  const path = headers.get("x-littlecafe-pathname") ?? "/";
  if (!shouldTrackPath(path)) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const userAgent = headers.get("user-agent");
  const { browser, os, deviceType, isBot } = parseUserAgent(userAgent);
  const ipAddress = cleanIpAddress(
    firstForwardedValue(headers.get("x-forwarded-for")) ?? headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? headers.get("x-vercel-forwarded-for")
  );

  const { error } = await supabase.from("website_visits").insert({
    path,
    search: headers.get("x-littlecafe-search") || null,
    referrer: headers.get("referer") || null,
    host: headers.get("host") || null,
    ip_address: ipAddress,
    country: headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || null,
    region: headers.get("x-vercel-ip-country-region") || null,
    city: headers.get("x-vercel-ip-city") || null,
    user_agent: userAgent,
    browser,
    os,
    device_type: deviceType,
    is_bot: isBot
  });

  if (error) {
    console.error("[visits] failed to record visit", error.message);
  }
}

export async function getWebsiteVisits(): Promise<{ visits: WebsiteVisit[]; summary: WebsiteVisitSummary }> {
  noStore();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("website_visits").select("*").order("visited_at", { ascending: false }).limit(100);
  const visits = (data ?? []) as WebsiteVisit[];
  const uniqueIps = new Set(visits.map((visit) => visit.ip_address).filter(Boolean)).size;
  const pathCounts = new Map<string, number>();

  for (const visit of visits) {
    pathCounts.set(visit.path, (pathCounts.get(visit.path) ?? 0) + 1);
  }

  return {
    visits,
    summary: {
      total: visits.length,
      uniqueIps,
      bots: visits.filter((visit) => visit.is_bot).length,
      topPaths: [...pathCounts.entries()]
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    }
  };
}
