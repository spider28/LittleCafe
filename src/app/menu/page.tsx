import { PageHeader } from "@/components/PageHeader";
import { menuSections } from "@/lib/content";

export const metadata = { title: "Menu" };

export default function MenuPage() {
  return (
    <>
      <PageHeader title="Menu" description="Coffee, breakfast, lunch, and sweets made for lingering or taking along." />
      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-14 sm:px-6 lg:px-8">
        {menuSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-2xl font-bold text-ink">{section.title}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {section.items.map((item) => (
                <article key={item.name} className="rounded-md border border-black/10 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-ink">{item.name}</h3>
                    <p className="font-semibold text-roast">{item.price}</p>
                  </div>
                  <p className="mt-2 text-sm text-ink/65">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
