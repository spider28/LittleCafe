import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { createReservationAction, deleteReservationAction } from "@/lib/actions";
import { getAdminReservationsData } from "@/lib/data";

export const metadata = { title: "Reservations admin" };

export default async function AdminReservationsPage() {
  const reservations = await getAdminReservationsData();

  return (
    <div className="grid gap-6">
      <AdminSectionHeader title="Reservations" description="Create a reservation and review the latest entries on the cafe schedule." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <AdminPanel title="Create reservation">
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
        </AdminPanel>

        <AdminPanel title="Reservation list" description={`${reservations.length} most recent reservations.`}>
          <div className="grid gap-3">
            {reservations.map((reservation) => (
              <article key={reservation.id} className="rounded-md bg-crema p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{reservation.title}</p>
                    <p className="mt-1 text-ink/70">
                      {new Date(reservation.starts_at).toLocaleString()} – {new Date(reservation.ends_at).toLocaleTimeString()}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-ink/55">
                      Party of {reservation.party_size} · {reservation.status}
                    </p>
                    {reservation.guest_name ? <p className="mt-2 text-ink/65">{reservation.guest_name}</p> : null}
                  </div>
                  <form action={deleteReservationAction}>
                    <input type="hidden" name="id" value={reservation.id} />
                    <button className="font-semibold text-berry" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </article>
            ))}
            {!reservations.length ? <p className="text-sm text-ink/65">No reservations have been created yet.</p> : null}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
