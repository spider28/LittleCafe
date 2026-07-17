import Link from "next/link";
import { signInAction, signOutAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/admin";
import { getWebsiteVisits } from "@/lib/visits";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Website visits" };

export default async function AdminVisitsPage() {
  const { user, allowed } = await requireAdmin();

  if (!user) {
    return <LoginView />;
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-ink">Admin access required</h1>
        <p className="mt-3 text-ink/70">You are signed in, but this account is not in the administrator allowlist.</p>
        <form action={signOutAction} className="mt-6">
          <SubmitButton>Sign out</SubmitButton>
        </form>
      </section>
    );
  }

  const { visits, summary, warning } = await getWebsiteVisits();

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-berry">Admin</p>
          <h1 className="text-4xl font-bold text-ink">Website visits</h1>
          <p className="mt-2 text-sm text-ink/65">Showing the latest 100 recorded public page visits.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="rounded-md border border-black/15 px-4 py-2 text-sm font-semibold text-ink">
            Dashboard
          </Link>
          <form action={signOutAction}>
            <SubmitButton>Sign out</SubmitButton>
          </form>
        </div>
      </div>

      {warning ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
          <p className="font-semibold">Visit data needs attention</p>
          <p className="mt-1">{warning}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Recent visits" value={summary.total} />
        <Metric label="Unique IPs" value={summary.uniqueIps} />
        <Metric label="Likely bots" value={summary.bots} />
      </div>

      <section className="rounded-md border border-black/10 bg-white p-5">
        <h2 className="text-xl font-semibold text-ink">Top pages</h2>
        <div className="mt-4 grid gap-2">
          {summary.topPaths.length ? (
            summary.topPaths.map((item) => (
              <div key={item.path} className="flex items-center justify-between rounded-md bg-crema px-3 py-2 text-sm">
                <span className="font-medium text-ink">{item.path}</span>
                <span className="text-ink/65">{item.count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink/65">No visits recorded yet.</p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-black/10 bg-white">
        <div className="border-b border-black/10 p-5">
          <h2 className="text-xl font-semibold text-ink">Recent visits</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/10 text-left text-sm">
            <thead className="bg-crema text-xs uppercase tracking-wide text-ink/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Page</th>
                <th className="px-4 py-3 font-semibold">Referrer</th>
                <th className="px-4 py-3 font-semibold">IP</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Device</th>
                <th className="px-4 py-3 font-semibold">User agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {visits.map((visit) => (
                <tr key={visit.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-ink/70">{new Date(visit.visited_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {visit.path}
                    {visit.search ? <span className="block text-xs font-normal text-ink/55">{visit.search}</span> : null}
                  </td>
                  <td className="max-w-56 truncate px-4 py-3 text-ink/70">{visit.referrer || "Direct"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/70">{visit.ip_address || "Unknown"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/70">{[visit.city, visit.region, visit.country].filter(Boolean).join(", ") || "Unknown"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/70">
                    {[visit.device_type, visit.browser, visit.os].filter(Boolean).join(" / ") || "Unknown"}
                    {visit.is_bot ? <span className="block text-xs font-semibold text-berry">Bot</span> : null}
                  </td>
                  <td className="max-w-80 px-4 py-3 text-xs text-ink/60">{visit.user_agent || "Unknown"}</td>
                </tr>
              ))}
              {!visits.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-ink/65" colSpan={7}>
                    No visits recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-black/10 bg-white p-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-ink/55">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}

function LoginView() {
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-ink">Administrator login</h1>
      <p className="mt-3 text-ink/70">Sign in with a Supabase Auth account that is allowlisted for Admin access.</p>
      <div className="mt-6 rounded-md border border-black/10 bg-white p-6">
        <ActionForm action={signInAction} buttonLabel="Sign in">
          <Field name="email" label="Email" type="email" required />
          <Field name="password" label="Password" type="password" required />
        </ActionForm>
      </div>
    </section>
  );
}
