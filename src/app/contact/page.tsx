import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { submitContactAction } from "@/lib/actions";
import { cafe } from "@/lib/content";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Contact" description="Send a message to the cafe team. We will get it by email and keep a copy for follow-up." />
      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-14 sm:px-6 md:grid-cols-[1fr_1.4fr] lg:px-8">
        <aside className="rounded-md border border-black/10 bg-white p-6">
          <h2 className="text-xl font-semibold text-ink">Visit</h2>
          <p className="mt-3 text-ink/70">{cafe.address}</p>
          <p className="mt-2 text-ink/70">{cafe.phone}</p>
          <p className="mt-2 text-ink/70">{cafe.email}</p>
        </aside>
        <div className="rounded-md border border-black/10 bg-white p-6">
          <ActionForm action={submitContactAction} buttonLabel="Send message">
            <Field name="fullName" label="Name" required />
            <Field name="email" label="Email" type="email" required />
            <Field name="phone" label="Phone" />
            <Field name="message" label="Message" textarea required />
          </ActionForm>
        </div>
      </section>
    </>
  );
}
