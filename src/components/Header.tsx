"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cafe, navItems } from "@/lib/content";
import { clsx } from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type LoginStatus = {
  loading: boolean;
  email: string | null;
};

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>({ loading: true, email: null });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setLoginStatus({ loading: false, email: data.user?.email ?? null });
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoginStatus({ loading: false, email: session?.user.email ?? null });
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-crema/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-ink">
          {cafe.name}
        </Link>
        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-black/15 md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "rounded-md px-3 py-2 text-sm font-medium transition hover:bg-white/70",
                pathname === item.href ? "bg-white text-roast" : "text-ink/75"
              )}
            >
              {item.label}
            </Link>
          ))}
          <AuthStatus status={loginStatus} />
        </nav>
      </div>
      {open ? (
        <nav className="grid gap-1 border-t border-black/10 px-4 py-3 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={clsx("rounded-md px-3 py-2 text-sm font-medium", pathname === item.href ? "bg-white text-roast" : "text-ink")}
            >
              {item.label}
            </Link>
          ))}
          <AuthStatus status={loginStatus} mobile />
        </nav>
      ) : null}
    </header>
  );
}

function AuthStatus({ status, mobile = false }: { status: LoginStatus; mobile?: boolean }) {
  const signedIn = Boolean(status.email);
  const label = status.loading ? "Checking login" : signedIn ? "Signed in" : "Signed out";

  return (
    <span
      title={status.email ?? label}
      className={clsx(
        "inline-flex max-w-44 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium",
        mobile ? "mx-3 mt-1 justify-start" : "ml-2",
        signedIn ? "border-sage/30 bg-sage/10 text-ink" : "border-black/10 bg-white/55 text-ink/65"
      )}
    >
      <span className={clsx("h-2 w-2 shrink-0 rounded-full", signedIn ? "bg-sage" : "bg-ink/35")} aria-hidden="true" />
      <span className="truncate">{status.email ?? label}</span>
    </span>
  );
}
