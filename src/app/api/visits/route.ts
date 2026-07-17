import { NextResponse } from "next/server";
import { recordWebsiteVisitFromRequest } from "@/lib/visits";

export const runtime = "nodejs";

type VisitRequestBody = {
  path?: unknown;
  search?: unknown;
  referrer?: unknown;
};

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as VisitRequestBody | null;
  const result = await recordWebsiteVisitFromRequest(request.headers, {
    path: stringOrNull(body?.path),
    search: stringOrNull(body?.search),
    referrer: stringOrNull(body?.referrer)
  });

  return NextResponse.json(result);
}
