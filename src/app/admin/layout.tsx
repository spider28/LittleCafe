import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/Field";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { signInAction, signOutAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, allowed } = await requireAdmin();

  if (!user) {
    return <LoginView />;
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-ink">Admin access required</h1>
        <p className="mt-3 text-ink/70">You are signed in, but this account is not in the administrator allowlist.</p>
        <div className="mt-6">
          <ActionForm action={signOutAction} buttonLabel="Sign out" />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-berry">Admin</p>
          <p className="mt-1 text-2xl font-bold text-ink">LittleCafe management</p>
          <p className="mt-1 max-w-72 truncate text-sm text-ink/60">{user.email}</p>
        </div>
        <ActionForm action={signOutAction} buttonLabel="Sign out" />
      </div>

      <AdminTabs />
      {children}
    </section>
  );
}

function LoginView() {
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-ink">Administrator login</h1>
      <p className="mt-3 text-ink/70">Sign in with a Supabase Auth account that is allowlisted for Admin access.</p>
      <div className="mt-6 rounded-md border border-black/10 bg-white p-6">
        <ActionForm action={signInAction} buttonLabel="Sign in">
          <Field name="email" label="Email" type="email" required />
          <Field name="password" label="Password" type="password" required />
        </ActionForm>
      </div>
    </section>
  );
}
