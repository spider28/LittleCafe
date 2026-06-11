import type { Database } from "@/types/database";

type Reservation = Database["public"]["Tables"]["reservations"]["Row"];

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function CalendarGrid({ reservations }: { reservations: Reservation[] }) {
  const grouped = days.map((day, index) => ({
    day,
    items: reservations.filter((reservation) => new Date(reservation.starts_at).getDay() === index)
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-7">
      {grouped.map((group) => (
        <section key={group.day} className="min-h-44 rounded-md border border-black/10 bg-white p-4">
          <h2 className="font-semibold text-ink">{group.day}</h2>
          <div className="mt-3 grid gap-3">
            {group.items.length ? (
              group.items.map((item) => (
                <article key={item.id} className="rounded-md border-l-4 border-sage bg-crema p-3 text-sm">
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="text-ink/70">
                    {new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(item.starts_at))}
                  </p>
                  <p className="text-ink/70">Party of {item.party_size}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-ink/55">No reservations.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
