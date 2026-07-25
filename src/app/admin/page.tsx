import Link from "next/link";
import { BarChart3, BotMessageSquare, CalendarDays, FileCheck2, Images, Mail } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { getAdminOverview } from "@/lib/data";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const { settings, counts } = await getAdminOverview();
  const sections = [
    {
      href: "/admin/chatbot",
      label: "Chatbot",
      description: "Configure the provider, review knowledge gaps, and manage approved knowledge.",
      metric: `${counts.knowledge} approved · ${counts.knowledgeGaps} to review`,
      icon: BotMessageSquare
    },
    {
      href: "/admin/reservations",
      label: "Reservations",
      description: "Create reservations and manage the current schedule.",
      metric: `${counts.reservations} reservations`,
      icon: CalendarDays
    },
    {
      href: "/admin/gallery",
      label: "Gallery",
      description: "Upload, order, and remove public gallery photos.",
      metric: `${counts.gallery} photos`,
      icon: Images
    },
    {
      href: "/admin/waivers",
      label: "Waivers",
      description: "Search and review submitted customer waivers.",
      metric: `${counts.waivers} submissions`,
      icon: FileCheck2
    },
    {
      href: "/admin/messages",
      label: "Messages",
      description: "Review messages sent through the contact form.",
      metric: `${counts.contacts} messages`,
      icon: Mail
    },
    {
      href: "/admin/visits",
      label: "Analytics",
      description: "Review recent website traffic, locations, and devices.",
      metric: "Latest 100 visits",
      icon: BarChart3
    }
  ];

  return (
    <div className="grid gap-6">
      <AdminSectionHeader title="Dashboard overview" description="Choose an area to manage. Each section loads only the information it needs." />

      <div className="rounded-md border border-black/10 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink/55">Chatbot status</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${settings.enabled ? "bg-sage" : "bg-ink/30"}`} aria-hidden="true" />
          <p className="font-semibold text-ink">{settings.enabled ? "Enabled" : "Disabled"}</p>
          <span className="rounded-full bg-crema px-3 py-1 text-xs font-semibold uppercase tracking-wide text-roast">{settings.provider}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-md border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-roast/35 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-crema text-roast">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">{section.metric}</span>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-ink group-hover:text-roast">{section.label}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/65">{section.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
