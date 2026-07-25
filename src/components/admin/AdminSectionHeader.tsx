type AdminSectionHeaderProps = {
  title: string;
  description: string;
};

export function AdminSectionHeader({ title, description }: AdminSectionHeaderProps) {
  return (
    <header>
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{description}</p>
    </header>
  );
}
