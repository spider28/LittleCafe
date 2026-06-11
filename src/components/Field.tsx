type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  defaultValue?: string;
  placeholder?: string;
};

export function Field({ label, name, type = "text", required, textarea, defaultValue, placeholder }: FieldProps) {
  const className =
    "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-roast focus:ring-2 focus:ring-roast/20";

  return (
    <label className="grid gap-1 text-sm font-medium text-ink">
      {label}
      {textarea ? (
        <textarea name={name} required={required} defaultValue={defaultValue} placeholder={placeholder} rows={5} className={className} />
      ) : (
        <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} className={className} />
      )}
    </label>
  );
}
