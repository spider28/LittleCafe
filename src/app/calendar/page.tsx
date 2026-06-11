import { CalendarGrid } from "@/components/CalendarGrid";
import { PageHeader } from "@/components/PageHeader";
import { getWeeklyReservations } from "@/lib/data";

export const metadata = { title: "Calender" };

export default async function CalendarPage() {
  const reservations = await getWeeklyReservations();

  return (
    <>
      <PageHeader title="Calender" description="A read-only weekly view of reservations and cafe table blocks." />
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <CalendarGrid reservations={reservations} />
      </section>
    </>
  );
}
