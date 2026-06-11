import Link from "next/link";
import { CalendarDays, Coffee, Handshake } from "lucide-react";
import { cafe, menuSections } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      <section className="relative min-h-[70vh] overflow-hidden bg-ink text-white">
        <img
          src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1800&q=80"
          alt="LittleCafe espresso bar"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        <div className="relative mx-auto flex min-h-[70vh] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brass">Small cafe, big welcome</p>
            <h1 className="mt-4 text-5xl font-bold leading-tight sm:text-7xl">{cafe.name}</h1>
            <p className="mt-5 text-xl leading-8 text-white/85">{cafe.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/menu" className="rounded-md bg-brass px-5 py-3 text-sm font-semibold text-ink">
                View Menu
              </Link>
              <Link href="/contact" className="rounded-md border border-white/60 px-5 py-3 text-sm font-semibold text-white">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
        {[
          { icon: Coffee, title: "Coffee & Kitchen", text: `Fresh espresso, seasonal plates, and ${menuSections.length} simple menu sections.` },
          { icon: CalendarDays, title: "Reservations", text: "See the weekly reservation calendar before planning a visit or private table." },
          { icon: Handshake, title: "Partnerships", text: "Host workshops, pop-ups, and neighborhood gatherings with the LittleCafe team." }
        ].map((item) => (
          <article key={item.title} className="rounded-md border border-black/10 bg-white p-6">
            <item.icon className="h-7 w-7 text-berry" />
            <h2 className="mt-4 text-xl font-semibold text-ink">{item.title}</h2>
            <p className="mt-2 text-ink/70">{item.text}</p>
          </article>
        ))}
      </section>
    </>
  );
}
