import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { getAdminMessages } from "@/lib/data";

export const metadata = { title: "Messages admin" };

export default async function AdminMessagesPage() {
  const messages = await getAdminMessages();

  return (
    <div className="grid gap-6">
      <AdminSectionHeader title="Messages" description="Review the latest messages sent through the public contact form." />

      <AdminPanel title="Contact messages" description={`${messages.length} most recent messages.`}>
        <div className="grid gap-3 md:grid-cols-2">
          {messages.map((message) => (
            <article key={message.id} className="rounded-md bg-crema p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{message.full_name}</p>
                  <p className="mt-1 text-ink/70">{message.email}</p>
                  {message.phone ? <p className="text-ink/70">{message.phone}</p> : null}
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-ink/55">
                  Email {message.email_status}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap leading-6 text-ink/75">{message.message}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-ink/50">{new Date(message.created_at).toLocaleString()}</p>
            </article>
          ))}
          {!messages.length ? <p className="text-sm text-ink/65">No contact messages have been received yet.</p> : null}
        </div>
      </AdminPanel>
    </div>
  );
}
