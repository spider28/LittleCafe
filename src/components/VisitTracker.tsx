import { headers } from "next/headers";
import { recordWebsiteVisit } from "@/lib/visits";

export async function VisitTracker() {
  await recordWebsiteVisit(await headers());
  return null;
}
