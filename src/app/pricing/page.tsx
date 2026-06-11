import { PageHeader } from "@/components/PageHeader";
import { pricing } from "@/lib/content";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <>
      <PageHeader title="Pricing" description="Simple options for meetings, gatherings, and after-hours cafe moments." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-14 sm:px-6 md:grid-cols-3 lg:px-8">
        {pricing.map((item) => (
          <article key={item.title} className="rounded-md border border-black/10 bg-white p-6">
            <h2 className="text-xl font-semibold text-ink">{item.title}</h2>
            <p className="mt-4 text-4xl font-bold text-roast">{item.price}</p>
            <p className="mt-4 text-ink/70">{item.details}</p>
          </article>
        ))}
      </section>
    </>
  );
}
