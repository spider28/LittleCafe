"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BotMessageSquare, CalendarDays, FileCheck2, Images, LayoutDashboard, Mail } from "lucide-react";
import { clsx } from "clsx";

const adminTabs = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/chatbot", label: "Chatbot", icon: BotMessageSquare },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/admin/gallery", label: "Gallery", icon: Images },
  { href: "/admin/waivers", label: "Waivers", icon: FileCheck2 },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/visits", label: "Analytics", icon: BarChart3 }
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1 rounded-md border border-black/10 bg-white p-1">
        {adminTabs.map((tab) => {
          const active = tab.href === "/admin" ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold transition",
                active ? "bg-roast text-white" : "text-ink/70 hover:bg-crema hover:text-ink"
              )}
            >
              <Icon size={16} aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
