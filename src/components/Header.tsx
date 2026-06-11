"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cafe, navItems } from "@/lib/content";
import { clsx } from "clsx";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
        </nav>
      ) : null}
    </header>
  );
}
