import Link from "next/link";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function AppShell({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  nav,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  nav?: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white shadow-sm">
              EP
            </div>
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {eyebrow}
                </p>
              )}
              <h1 className="truncate text-lg font-bold tracking-tight text-[var(--foreground)]">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-sm text-[var(--muted)]">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {nav?.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-slate-100 hover:text-[var(--foreground)]"
              >
                {item.label}
              </Link>
            ))}
            {actions}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}

export function SignOutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Button type="submit" variant="ghost" className="py-2">
        Sair
      </Button>
    </form>
  );
}
