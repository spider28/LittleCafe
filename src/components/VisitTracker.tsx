"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function VisitTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const search = searchParams.toString();
    void fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        search: search ? `?${search}` : "",
        referrer: document.referrer || null
      }),
      keepalive: true
    }).catch(() => {
      // Analytics should never interrupt a visitor's page.
    });
  }, [pathname, searchParams]);

  return null;
}
