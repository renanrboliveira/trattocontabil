"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type NavItem = {
  label: string;
  href?: string; // sem href = "em breve" (desabilitado)
  icon?: string;
  badge?: number;
  active?: boolean;
};

export type NavGroup = { label?: string; items: NavItem[] };

function SidebarNavLink({ item }: { item: NavItem }) {
  const base =
    "flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13.5px] font-medium";
  const inner = (
    <>
      {item.icon && (
        <span className="w-4 text-center opacity-80" aria-hidden>
          {item.icon}
        </span>
      )}
      {item.label}
      {item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto rounded-full bg-[var(--amber)] px-[7px] py-px text-[11px] font-bold text-white">
          {item.badge}
        </span>
      )}
    </>
  );

  if (!item.href) {
    return (
      <span
        title="Em breve"
        className={`${base} cursor-default text-[var(--sidebar-text)] opacity-45`}
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${base} ${
        item.active
          ? "bg-[var(--sidebar-hover)] font-semibold text-white"
          : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[#d3ddd9]"
      }`}
    >
      {inner}
    </Link>
  );
}

function SidebarContent({
  office,
  nav,
  signOut,
}: {
  office: { nome: string; meta?: string };
  nav: NavGroup[];
  signOut?: ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-gradient-to-br from-[#15705f] to-[var(--accent)] text-xs font-bold text-white">
          EP
        </div>
        <span className="text-[14.5px] font-semibold text-white">Extrato Pronto</span>
      </div>

      <div className="mx-3 mb-3 rounded-[7px] bg-[var(--sidebar-hover)] px-2.5 py-2 text-[12.5px] text-[var(--sidebar-text)]">
        <span className="block truncate text-[13px] font-semibold text-[#d3ddd9]">
          {office.nome}
        </span>
        {office.meta && <span className="block truncate">{office.meta}</span>}
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {nav.map((group, gi) => (
          <div key={group.label ?? gi} className="flex flex-col gap-0.5">
            {group.label && (
              <p className="px-2.5 pb-1 pt-4 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#47615a]">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <SidebarNavLink key={item.label} item={item} />
            ))}
          </div>
        ))}
      </nav>

      {signOut && (
        <div className="mt-auto border-t border-[var(--sidebar-hover)] px-4 py-3">
          {signOut}
        </div>
      )}
    </>
  );
}

export function AppShell({
  office,
  nav,
  title,
  topbarExtra,
  actions,
  signOut,
  children,
}: {
  office: { nome: string; meta?: string };
  nav: NavGroup[];
  title: string;
  topbarExtra?: ReactNode;
  actions?: ReactNode;
  signOut?: ReactNode;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-[var(--background)]">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col bg-[var(--sidebar)] lg:flex">
        <SidebarContent office={office} nav={nav} signOut={signOut} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[232px] flex-col bg-[var(--sidebar)]">
            <SidebarContent office={office} nav={nav} signOut={signOut} />
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Abrir menu"
              className="rounded-md border border-[var(--border)] px-2 py-1 text-sm lg:hidden"
              onClick={() => setDrawerOpen(true)}
            >
              ☰
            </button>
            <h1 className="truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
              {title}
            </h1>
            {topbarExtra}
          </div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </header>

        <main className="mx-auto max-w-[1080px] px-4 py-6 lg:px-7">{children}</main>
      </div>
    </div>
  );
}

export function SignOutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Button
        type="submit"
        variant="ghost"
        className="w-full justify-start px-2.5 py-2 text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-white"
      >
        Sair
      </Button>
    </form>
  );
}
