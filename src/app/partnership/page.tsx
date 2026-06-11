import { Mail } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Partnership" };

export default function PartnershipPage() {
  return (
    <>
      <PageHeader title="Partnership" description="Work with LittleCafe on small events, community programming, and local pop-ups." />
      <section className="mx-auto grid max-w-5xl gap-6 px-4 pb-14 sm:px-6 md:grid-cols-3 lg:px-8">
        {["Workshops", "Local Makers", "Private Tastings"].map((title) => (
          <article key={title} className="rounded-md border border-black/10 bg-white p-6">
            <h2 className="text-xl font-semibold text-ink">{title}</h2>
            <p className="mt-3 text-ink/70">Partner with the cafe team on a warm, manageable experience for your group.</p>
          </article>
        ))}
      </section>
      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <Link href="/contact" className="inline-flex items-center gap-2 rounded-md bg-roast px-5 py-3 text-sm font-semibold text-white">
          <Mail size={18} /> Start a conversation
        </Link>
      </div>
    </>
  );
}
