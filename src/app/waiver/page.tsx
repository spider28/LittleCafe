import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { submitWaiverAction } from "@/lib/actions";
import { cafe } from "@/lib/content";

export const metadata = { title: "Waiver" };

export default function WaiverPage() {
  return (
    <>
      <PageHeader title="Waiver" description="Review and acknowledge the cafe agreements before workshops, private gatherings, or special events." />
      <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="rounded-md border border-black/10 bg-white p-6">
          <ActionForm action={submitWaiverAction} buttonLabel="Submit waiver">
            <Field name="fullName" label="Full name" required />
            <Field name="phone" label="Phone" required />
            <Field name="email" label="Email" type="email" />
            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-ink">Agreements</legend>
              {cafe.agreements.map((agreement) => (
                <label key={agreement} className="flex gap-3 rounded-md border border-black/10 bg-crema p-3 text-sm text-ink/75">
                  <input type="checkbox" name="agreements" value={agreement} required className="mt-1 h-4 w-4" />
                  <span>{agreement}</span>
                </label>
              ))}
            </fieldset>
            <Field name="signature" label="Typed signature" required />
          </ActionForm>
        </div>
      </section>
    </>
  );
}
