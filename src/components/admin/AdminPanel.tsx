import { clsx } from "clsx";

type AdminPanelProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function AdminPanel({ title, description, children, className }: AdminPanelProps) {
  return (
    <section className={clsx("rounded-md border border-black/10 bg-white p-5", className)}>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink/65">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
