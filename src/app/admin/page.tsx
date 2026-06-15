import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import {
  createReservationAction,
  deleteGalleryPhotoAction,
  deleteReservationAction,
  signInAction,
  signOutAction,
  uploadGalleryPhotoAction
} from "@/lib/actions";
import { requireAdmin } from "@/lib/admin";
import { getAdminCollections } from "@/lib/data";
import { ActionForm } from "@/components/ActionForm";

export const metadata = { title: "Admin" };

type AdminPageProps = {
  searchParams: Promise<{ waiver?: string; date?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
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

  const data = await getAdminCollections(params);

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-berry">Admin</p>
          <h1 className="text-4xl font-bold text-ink">LittleCafe dashboard</h1>
        </div>
        <form action={signOutAction}>
          <SubmitButton>Sign out</SubmitButton>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Gallery upload">
          <ActionForm action={uploadGalleryPhotoAction} buttonLabel="Upload photo">
            <Field name="altText" label="Alt text" required />
            <Field name="displayOrder" label="Display order" type="number" defaultValue="0" required />
            <label className="grid gap-1 text-sm font-medium text-ink">
              Photo
              <input name="photo" type="file" accept="image/*" required className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm" />
            </label>
          </ActionForm>
          <div className="mt-6 grid gap-3">
            {data.gallery.map((photo) => (
              <div key={photo.id} className="flex items-center justify-between gap-3 rounded-md bg-crema p-3 text-sm">
                <span>{photo.alt_text}</span>
                <form action={deleteGalleryPhotoAction}>
                  <input type="hidden" name="id" value={photo.id} />
                  <input type="hidden" name="storagePath" value={photo.storage_path} />
                  <button className="font-semibold text-berry" type="submit">
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Create reservation">
          <form action={createReservationAction} className="grid gap-4">
            <Field name="title" label="Title" required />
            <Field name="guestName" label="Guest name" />
            <Field name="guestPhone" label="Guest phone" />
            <Field name="partySize" label="Party size" type="number" defaultValue="2" required />
            <Field name="startsAt" label="Starts at" type="datetime-local" required />
            <Field name="endsAt" label="Ends at" type="datetime-local" required />
            <label className="grid gap-1 text-sm font-medium text-ink">
              Status
              <select name="status" className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm">
                {["reserved", "seated", "completed", "cancelled"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <Field name="notes" label="Notes" textarea />
            <SubmitButton>Create reservation</SubmitButton>
          </form>
        </Panel>
      </div>

      <Panel title="Reservations">
        <div className="grid gap-3">
          {data.reservations.map((reservation) => (
            <div key={reservation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-crema p-3 text-sm">
              <span>
                <strong>{reservation.title}</strong> - {new Date(reservation.starts_at).toLocaleString()} - {new Date(reservation.ends_at).toLocaleTimeString()} - Party of {reservation.party_size}
              </span>
              <form action={deleteReservationAction}>
                <input type="hidden" name="id" value={reservation.id} />
                <button className="font-semibold text-berry" type="submit">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Waiver search">
        <form className="mb-5 grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/admin">
          <Field name="waiver" label="Name or phone" defaultValue={params.waiver ?? ""} />
          <Field name="date" label="Date" type="date" defaultValue={params.date ?? ""} />
          <button type="submit" className="self-end rounded-md bg-roast px-5 py-2.5 text-sm font-semibold text-white">
            Search
          </button>
        </form>
        <div className="grid gap-3">
          {data.waivers.map((waiver) => (
            <div key={waiver.id} className="rounded-md bg-crema p-3 text-sm">
              <p className="font-semibold">{waiver.full_name} - {waiver.phone}</p>
              <p className="text-ink/65">{new Date(waiver.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Contact messages">
        <div className="grid gap-3">
          {data.contacts.map((message) => (
            <article key={message.id} className="rounded-md bg-crema p-3 text-sm">
              <p className="font-semibold">{message.full_name} - {message.email}</p>
              <p className="mt-1 text-ink/70">{message.message}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-ink/55">Email {message.email_status}</p>
            </article>
          ))}
        </div>
      </Panel>
    </section>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-black/10 bg-white p-5">
      <h2 className="mb-4 text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
