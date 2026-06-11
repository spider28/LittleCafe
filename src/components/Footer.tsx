import { cafe } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-black/10 bg-ink text-crema">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div>
          <p className="text-lg font-semibold">{cafe.name}</p>
          <p className="mt-2 text-sm text-crema/75">{cafe.tagline}</p>
        </div>
        <div className="text-sm text-crema/80">
          <p>{cafe.address}</p>
          <p>{cafe.phone}</p>
          <p>{cafe.email}</p>
        </div>
        <div className="text-sm text-crema/80">
          {cafe.hours.map((item) => (
            <p key={item.day}>
              <span className="font-medium text-crema">{item.day}:</span> {item.value}
            </p>
          ))}
        </div>
      </div>
    </footer>
  );
}
