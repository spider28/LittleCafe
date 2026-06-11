type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <section className="bg-crema">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-berry">{eyebrow}</p> : null}
        <h1 className="mt-2 text-4xl font-bold text-ink sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-ink/70">{description}</p>
      </div>
    </section>
  );
}
