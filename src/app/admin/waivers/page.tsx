import { Field } from "@/components/Field";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { getAdminWaivers } from "@/lib/data";

export const metadata = { title: "Waivers admin" };

type AdminWaiversPageProps = {
  searchParams: Promise<{ waiver?: string; date?: string }>;
};

export default async function AdminWaiversPage({ searchParams }: AdminWaiversPageProps) {
  const params = await searchParams;
  const waivers = await getAdminWaivers(params);

  return (
    <div className="grid gap-6">
      <AdminSectionHeader title="Waivers" description="Search submitted waivers by customer name, phone number, or submission date." />

      <AdminPanel title="Search submissions">
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/admin/waivers">
          <Field name="waiver" label="Name or phone" defaultValue={params.waiver ?? ""} />
          <Field name="date" label="Date" type="date" defaultValue={params.date ?? ""} />
          <button type="submit" className="self-end rounded-md bg-roast px-5 py-2.5 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </AdminPanel>

      <AdminPanel title="Submitted waivers" description={`${waivers.length} matching submissions.`}>
        <div className="grid gap-3 md:grid-cols-2">
          {waivers.map((waiver) => (
            <article key={waiver.id} className="rounded-md bg-crema p-4 text-sm">
              <p className="font-semibold text-ink">{waiver.full_name}</p>
              <p className="mt-1 text-ink/70">{waiver.phone}</p>
              {waiver.email ? <p className="text-ink/70">{waiver.email}</p> : null}
              <p className="mt-3 text-xs uppercase tracking-wide text-ink/55">{new Date(waiver.created_at).toLocaleString()}</p>
            </article>
          ))}
          {!waivers.length ? <p className="text-sm text-ink/65">No waiver submissions match this search.</p> : null}
        </div>
      </AdminPanel>
    </div>
  );
}
