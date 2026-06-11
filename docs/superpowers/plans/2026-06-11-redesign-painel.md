# Redesign do Painel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o redesign aprovado (spec `docs/superpowers/specs/2026-06-11-redesign-painel-design.md`): sidebar escura verde-pinheiro, painel orientado a exceção com filtros/busca/paginação e seletor de competências.

**Architecture:** Next.js 16 App Router em `web/`. Tokens via CSS variables em `globals.css` (nomes mantidos, valores trocados). `AppShell` vira client component (sidebar + topbar + drawer mobile). Filtros, busca e paginação do painel são server-side via query params (`?comp=&f=&q=&page=`) — sem estado client além do drawer e do dropdown de competência. Derivação de pendências em módulo puro (`derive.ts`).

**Tech Stack:** Next.js 16.2.9, React 19, Tailwind CSS 4, Supabase (queries existentes). Fontes: Hanken Grotesk + IBM Plex Mono via `next/font/google`.

**Notas para o executor:**
- `web/AGENTS.md` avisa: este Next.js tem APIs divergentes do treino. Antes de mexer em fonts/searchParams, confira `web/node_modules/next/dist/docs/`. Padrões já usados no repo: `searchParams`/`params` são `Promise` (ver `login/page.tsx`), fontes via `next/font/google` com `variable`.
- **Sem framework de teste** no projeto (só eslint) e regra do usuário: não adicionar dependência sem confirmar. Verificação por task: `npm run build` + `npm run lint` em `web/`, e checklist manual no fim.
- Verificação manual usa `npm run dev` (porta 3001) com Supabase local já configurado.
- Commits **sem** `Co-Authored-By`.
- Desvios conscientes do spec (aprovar com o usuário se discordar): (1) filtro por banco fica de fora — a busca cobre o caso no piloto; (2) `thead` sticky descartado — com paginação de 25 itens a tabela não cresce o bastante para precisar.

---

### Task 1: Tokens de cor e tipografia

**Files:**
- Modify: `web/src/app/globals.css`
- Modify: `web/src/app/layout.tsx`

- [ ] **Step 1: Reescrever os tokens em `globals.css`**

Substituir o conteúdo de `web/src/app/globals.css` por:

```css
@import "tailwindcss";

:root {
  --sidebar: #0d1f1b;
  --sidebar-hover: #16312b;
  --sidebar-text: #8fa39d;
  --background: #f4f7f6;
  --surface: #ffffff;
  --foreground: #14201d;
  --muted: #7e8d88;
  --muted-foreground: #51635e;
  --border: #e0e6e4;
  --border-strong: #c3d0cb;
  --accent: #0e5246;
  --accent-hover: #0a4038;
  --accent-soft: #e2efec;
  --amber: #b45309;
  --ring: #0e5246;
  --shadow-sm: 0 1px 2px rgb(13 31 27 / 0.05);
  --shadow-md: 0 4px 12px rgb(13 31 27 / 0.07);
  --radius: 0.625rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-muted: var(--muted);
  --color-border: var(--border);
  --color-accent: var(--accent);
  --font-sans: var(--font-hanken);
  --font-mono: var(--font-plex-mono);
}

html {
  color-scheme: light;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-hanken), system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background: var(--accent-soft);
  color: var(--foreground);
}

/* Form controls */
input[type="text"],
input[type="email"],
input[type="password"],
input[type="file"],
select,
textarea {
  font-family: inherit;
  font-size: 0.875rem;
}

input[type="file"]::file-selector-button {
  margin-right: 0.75rem;
  border: 0;
  border-radius: 0.4375rem;
  background: var(--accent-soft);
  color: var(--accent);
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

input[type="file"]::file-selector-button:hover {
  background: #d3e7e1;
}
```

- [ ] **Step 2: Trocar a fonte em `layout.tsx`**

Substituir o conteúdo de `web/src/app/layout.tsx` por:

```tsx
import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Extrato Pronto",
  description: "Piloto E2 — recepção e conversão de extratos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${hanken.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `cd /Users/renanoliveira/dev/extrato-pronto/web && npm run build`
Expected: build OK (warnings de fontes não usadas não devem ocorrer; erro de export de `--font-jakarta` não pode existir — a única referência era `globals.css`, já trocada).

- [ ] **Step 4: Commit**

```bash
git add web/src/app/globals.css web/src/app/layout.tsx
git commit -m "feat(design): tokens verde-pinheiro e fonte Hanken Grotesk"
```

---

### Task 2: Primitivos — Button, Field, StatusBadge

**Files:**
- Modify: `web/src/components/ui/button.tsx`
- Modify: `web/src/components/ui/field.tsx`
- Modify: `web/src/components/ui/status-badge.tsx`

- [ ] **Step 1: Restyle do Button**

Substituir o conteúdo de `web/src/components/ui/button.tsx` por:

```tsx
import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm",
  secondary:
    "border border-[var(--border-strong)] bg-white text-[var(--foreground)] hover:bg-[#f6faf8]",
  ghost:
    "text-[var(--muted-foreground)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[7px] px-4 py-2 text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Restyle do Field**

Em `web/src/components/ui/field.tsx`, substituir a constante `controlClass` por:

```tsx
const controlClass =
  "mt-1.5 w-full rounded-[7px] border border-[var(--border-strong)] bg-white px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-sm transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20";
```

E no `<label>`, trocar `text-sm font-semibold` por `text-[13px] font-semibold`.

- [ ] **Step 3: Novo mapa de cores do StatusBadge**

Substituir o conteúdo de `web/src/components/ui/status-badge.tsx` por:

```tsx
const statusConfig: Record<string, { label: string; className: string }> = {
  convertido: {
    label: "Convertido",
    className: "bg-[#e3f2e9] text-[#15633a]",
  },
  exportado: {
    label: "Exportado",
    className: "bg-[var(--accent-soft)] text-[var(--accent)]",
  },
  recebido: {
    label: "Recebido",
    className: "bg-[#e6eefb] text-[#1e51b8]",
  },
  processando: {
    label: "Processando",
    className: "bg-[#faf0dc] text-[var(--amber)]",
  },
  duplicado: {
    label: "Duplicado",
    className: "bg-[#edf1ef] text-[var(--muted)]",
  },
  erro: {
    label: "Erro",
    className: "bg-[#fbe8e8] text-[#b42323]",
  },
  triagem: {
    label: "Triagem",
    className: "bg-[#faf0dc] text-[var(--amber)]",
  },
  falta: {
    label: "Falta",
    className: "bg-[#edf1ef] text-[var(--muted)]",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-[#edf1ef] text-[var(--muted)]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-[3px] text-[11.5px] font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
```

- [ ] **Step 4: Verificar build e commitar**

Run: `cd /Users/renanoliveira/dev/extrato-pronto/web && npm run build`
Expected: build OK.

```bash
git add web/src/components/ui/button.tsx web/src/components/ui/field.tsx web/src/components/ui/status-badge.tsx
git commit -m "feat(design): restyle de button, field e status-badge"
```

---

### Task 3: Card/StatCard, DataTable com paginação, FilterChips

**Files:**
- Modify: `web/src/components/ui/card.tsx`
- Modify: `web/src/components/ui/data-table.tsx`
- Create: `web/src/components/ui/filter-chips.tsx`

- [ ] **Step 1: Card com `actions` e StatCard com progresso/meta**

Substituir o conteúdo de `web/src/components/ui/card.tsx` por:

```tsx
import { type ReactNode } from "react";

export function Card({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3.5">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
              {description}
            </p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  meta,
  metaTone = "neutral",
  progress,
}: {
  label: string;
  value: string;
  suffix?: string;
  meta?: string;
  metaTone?: "neutral" | "up" | "warn";
  progress?: number;
}) {
  const metaTones = {
    neutral: "text-[var(--muted)]",
    up: "text-[#15803d]",
    warn: "font-semibold text-[var(--amber)]",
  };

  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-[26px] font-bold tabular-nums tracking-tight text-[var(--foreground)]">
        {value}
        {suffix && (
          <span className="text-sm font-medium text-[var(--muted)]"> {suffix}</span>
        )}
      </p>
      {meta && <p className={`mt-1 text-xs ${metaTones[metaTone]}`}>{meta}</p>}
      {progress !== undefined && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#e9efed]">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

Nota: `StatCard` perde o prop `accent` (borda esquerda colorida). O call site em `painel/page.tsx` quebra o build até a Task 4 ajustar — por isso Tasks 3 e 4 commitam juntas **OU** ajuste o call site nesta task (ver Step 4).

- [ ] **Step 2: DataTable mais denso + DataTablePager**

Substituir o conteúdo de `web/src/components/ui/data-table.tsx` por:

```tsx
import Link from "next/link";
import { type ReactNode } from "react";

export function DataTable({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-[var(--border)] ${className}`}>
      <table className="min-w-full text-left text-[13.5px]">{children}</table>
    </div>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[var(--border)] bg-[#f6faf8] text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {children}
      </tr>
    </thead>
  );
}

export function DataTableTh({
  children,
  align = "left",
}: {
  children?: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th className={`px-4 py-2.5 font-bold ${align === "right" ? "text-right" : ""}`}>
      {children}
    </th>
  );
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-[#ecf1ef]">{children}</tbody>;
}

export function DataTableRow({ children }: { children: ReactNode }) {
  return <tr className="transition-colors hover:bg-[#f6faf8]">{children}</tr>;
}

export function DataTableTd({
  children,
  align = "left",
  className = "",
  colSpan,
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`px-4 py-2.5 text-[var(--foreground)] ${align === "right" ? "text-right" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

export function DataTablePager({
  page,
  pageCount,
  total,
  label,
  hrefForPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  label: string;
  hrefForPage: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] bg-[#fafcfb] px-4 py-2.5 text-[12.5px] text-[var(--muted)]">
      <span>{label}</span>
      <span className="flex gap-1">
        {pages.map((p) =>
          p === page ? (
            <span
              key={p}
              className="inline-flex h-[26px] min-w-[26px] items-center justify-center rounded-md bg-[var(--accent)] px-1 text-xs font-bold text-white"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={hrefForPage(p)}
              className="inline-flex h-[26px] min-w-[26px] items-center justify-center rounded-md border border-[var(--border)] bg-white px-1 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent-soft)]"
            >
              {p}
            </Link>
          )
        )}
      </span>
      <span className="sr-only">{total} itens no total</span>
    </div>
  );
}
```

Nota: o `DataTablePager` é renderizado **fora** do `<table>`, logo após o `<DataTable>`, dentro do mesmo Card.

- [ ] **Step 3: Criar FilterChips**

Criar `web/src/components/ui/filter-chips.tsx`:

```tsx
import Link from "next/link";

export type Chip = {
  label: string;
  count?: number;
  href: string;
  active?: boolean;
  tone?: "default" | "warn";
};

export function FilterChips({ chips }: { chips: Chip[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => {
        const activeClass =
          chip.tone === "warn"
            ? "border-[var(--amber)] bg-[var(--amber)] text-white"
            : "border-[var(--accent)] bg-[var(--accent)] text-white";
        return (
          <Link
            key={chip.label}
            href={chip.href}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              chip.active
                ? activeClass
                : "border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:bg-[#f6faf8]"
            }`}
          >
            {chip.label}
            {chip.count !== undefined && (
              <span className={chip.active ? "opacity-80" : "text-[var(--muted)]"}>
                {chip.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Corrigir call sites do StatCard para compilar**

Em `web/src/app/painel/page.tsx`, trocar o bloco das StatCards (linhas ~72–77) por:

```tsx
<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <StatCard label="Competência ativa" value={competenciaLabel} />
  <StatCard label="Convertidos" value={String(convertidos)} />
  <StatCard label="Exportados" value={String(exportados)} />
  <StatCard label="Aguardando triagem" value={String(triagem)} metaTone="warn" />
</section>
```

(É ajuste temporário só para compilar — a Task 7 reescreve a página.)

- [ ] **Step 5: Verificar build e commitar**

Run: `cd /Users/renanoliveira/dev/extrato-pronto/web && npm run build`
Expected: build OK.

```bash
git add web/src/components/ui/card.tsx web/src/components/ui/data-table.tsx web/src/components/ui/filter-chips.tsx web/src/app/painel/page.tsx
git commit -m "feat(design): card com progresso, data-table com pager e filter-chips"
```

---

### Task 4: AppShell — sidebar + topbar (e adaptação dos 5 call sites)

**Files:**
- Modify: `web/src/components/app-shell.tsx` (reescrita)
- Modify: `web/src/app/painel/page.tsx` (só a invocação do AppShell)
- Modify: `web/src/app/painel/extratos/[id]/page.tsx` (invocação)
- Modify: `web/src/app/admin/page.tsx` (invocação)
- Modify: `web/src/app/admin/escritorios/novo/page.tsx` (invocação)
- Modify: `web/src/app/admin/escritorios/[id]/page.tsx` (invocação)

- [ ] **Step 1: Reescrever o AppShell**

Substituir o conteúdo de `web/src/components/app-shell.tsx` por:

```tsx
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
```

- [ ] **Step 2: Adaptar `painel/page.tsx` (só a invocação)**

Trocar o bloco `<AppShell ...>` (props) por:

```tsx
<AppShell
  office={{
    nome: escritorio?.nome ?? "Painel",
    meta: `${clientes?.length ?? 0} clientes ativos`,
  }}
  nav={[
    {
      label: "Operação",
      items: [
        { label: "Painel", href: "/painel", icon: "▦", active: true },
        { label: "Extratos", icon: "⇪", badge: triagem },
        { label: "Exportações", icon: "⇲" },
      ],
    },
    {
      label: "Cadastro",
      items: [
        { label: "Clientes", icon: "▤" },
        { label: "Configurações", icon: "⚙" },
      ],
    },
  ]}
  title="Painel"
  topbarExtra={
    <span className="rounded-md border border-[#c5ddd6] bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-xs font-medium text-[var(--accent)]">
      competência {competenciaLabel}
    </span>
  }
  signOut={<SignOutButton action={signOutAction} />}
>
```

(O fechamento `</AppShell>` e o corpo permanecem. A Task 7 substitui o corpo.)

- [ ] **Step 3: Adaptar `painel/extratos/[id]/page.tsx`**

Trocar o bloco `<AppShell ...>` por:

```tsx
<AppShell
  office={{ nome: "Extrato Pronto" }}
  nav={[
    {
      items: [{ label: "← Voltar ao painel", href: "/painel", icon: "▦" }],
    },
  ]}
  title={`${cliente?.razao_social ?? "Remetente não identificado"} · ${extrato.banco_nome ?? "?"}`}
  topbarExtra={
    <span className="hidden truncate font-mono text-xs text-[var(--muted)] sm:inline">
      {extrato.arquivo_nome} · {comp ? `${String(comp.mes).padStart(2, "0")}/${comp.ano}` : "?"} ·{" "}
      {extrato.transacao_count} tx
    </span>
  }
>
```

- [ ] **Step 4: Adaptar as 3 páginas de admin**

`web/src/app/admin/page.tsx` — trocar `<AppShell ...>` por:

```tsx
<AppShell
  office={{ nome: "Super admin", meta: user.email ?? undefined }}
  nav={[
    {
      items: [
        { label: "Escritórios", href: "/admin", icon: "▤", active: true },
        { label: "Painel", href: "/painel", icon: "▦" },
      ],
    },
  ]}
  title="Escritórios"
  actions={
    <Link href="/admin/escritorios/novo">
      <Button>Novo escritório</Button>
    </Link>
  }
  signOut={<SignOutButton action={signOutAction} />}
>
```

E **remover** o `<div className="mb-6 flex items-center justify-end">...</div>` (o botão foi para a topbar).

`web/src/app/admin/escritorios/novo/page.tsx` — trocar `<AppShell ...>` por:

```tsx
<AppShell
  office={{ nome: "Super admin" }}
  nav={[{ items: [{ label: "← Escritórios", href: "/admin", icon: "▤" }] }]}
  title="Novo escritório"
>
```

`web/src/app/admin/escritorios/[id]/page.tsx` — trocar `<AppShell ...>` por:

```tsx
<AppShell
  office={{ nome: "Super admin" }}
  nav={[{ items: [{ label: "← Escritórios", href: "/admin", icon: "▤" }] }]}
  title={escritorio.nome}
  topbarExtra={
    <span className="font-mono text-xs text-[var(--muted)]">{escritorio.slug}</span>
  }
>
```

- [ ] **Step 5: Verificar build e visual**

Run: `cd /Users/renanoliveira/dev/extrato-pronto/web && npm run build`
Expected: build OK.

Run: `npm run dev` e abrir `http://localhost:3001/painel`, `/admin`, um extrato.
Expected: sidebar escura à esquerda, topbar branca, navegação funcional, "Sair" no rodapé da sidebar, drawer no mobile (reduzir janela).

- [ ] **Step 6: Commit**

```bash
git add web/src/components/app-shell.tsx web/src/app/painel/page.tsx "web/src/app/painel/extratos/[id]/page.tsx" web/src/app/admin/page.tsx web/src/app/admin/escritorios/novo/page.tsx "web/src/app/admin/escritorios/[id]/page.tsx"
git commit -m "feat(design): AppShell com sidebar escura e topbar"
```

---

### Task 5: Helpers de competência + CompetenciaSelector

**Files:**
- Create: `web/src/lib/competencias.ts`
- Create: `web/src/components/competencia-selector.tsx`

- [ ] **Step 1: Criar helpers puros**

Criar `web/src/lib/competencias.ts`:

```ts
export function compLabel(ano: number, mes: number): string {
  return `${String(mes).padStart(2, "0")}/${ano}`;
}

export function compParam(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function parseCompParam(
  value: string | undefined
): { ano: number; mes: number } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  if (mes < 1 || mes > 12) return null;
  return { ano, mes };
}
```

- [ ] **Step 2: Criar o CompetenciaSelector (client)**

Criar `web/src/components/competencia-selector.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export type CompetenciaOption = {
  param: string; // "2026-05"
  label: string; // "05/2026"
  progress: number; // 0–100
  estado: "ativa" | "fechada" | "aberta";
};

function EstadoTag({ estado }: { estado: CompetenciaOption["estado"] }) {
  if (estado === "ativa") {
    return (
      <span className="rounded-[5px] bg-[var(--accent)] px-1.5 py-0.5 text-[10.5px] font-bold text-white">
        ativa
      </span>
    );
  }
  if (estado === "fechada") {
    return (
      <span className="rounded-[5px] bg-[#e3f2e9] px-1.5 py-0.5 text-[10.5px] font-bold text-[#15633a]">
        fechada ✓
      </span>
    );
  }
  return (
    <span className="rounded-[5px] bg-[#faf0dc] px-1.5 py-0.5 text-[10.5px] font-bold text-[var(--amber)]">
      aberta
    </span>
  );
}

export function CompetenciaSelector({
  opcoes,
  selecionada,
}: {
  opcoes: CompetenciaOption[];
  selecionada: string;
}) {
  const [open, setOpen] = useState(false);

  if (opcoes.length === 0) return null;

  const idx = opcoes.findIndex((o) => o.param === selecionada);
  const atual = opcoes[idx] ?? opcoes[0];
  // opcoes vem ordenado do mais recente para o mais antigo
  const maisRecente = idx > 0 ? opcoes[idx - 1] : null;
  const maisAntiga = idx >= 0 && idx < opcoes.length - 1 ? opcoes[idx + 1] : null;

  const arrowClass =
    "inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-[var(--border)] bg-white text-[13px] text-[var(--muted-foreground)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]";
  const arrowDisabled =
    "inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-[var(--border)] bg-white text-[13px] text-[var(--border-strong)]";

  return (
    <div className="relative flex items-center gap-1">
      {maisAntiga ? (
        <Link href={`/painel?comp=${maisAntiga.param}`} className={arrowClass} aria-label="Competência anterior">
          ◀
        </Link>
      ) : (
        <span className={arrowDisabled}>◀</span>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-[7px] border border-[#c5ddd6] bg-[var(--accent-soft)] px-3 py-1 font-mono text-xs font-medium text-[var(--accent)]"
      >
        {atual.label} <span className="text-[9px]">▾</span>
      </button>

      {maisRecente ? (
        <Link href={`/painel?comp=${maisRecente.param}`} className={arrowClass} aria-label="Próxima competência">
          ▶
        </Link>
      ) : (
        <span className={arrowDisabled}>▶</span>
      )}

      {open && (
        <>
          <button
            aria-label="Fechar"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-8 top-9 z-20 w-[290px] overflow-hidden rounded-[10px] border border-[var(--border)] bg-white shadow-[0_12px_32px_rgb(13_31_27_/_0.16)]">
            <p className="border-b border-[var(--border)] bg-[#f6faf8] px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Competências
            </p>
            {opcoes.map((opcao) => (
              <Link
                key={opcao.param}
                href={`/painel?comp=${opcao.param}`}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between border-b border-[#f0f4f2] px-3.5 py-2.5 last:border-b-0 hover:bg-[#f6faf8] ${
                  opcao.param === atual.param ? "bg-[var(--accent-soft)]" : ""
                }`}
              >
                <span className="font-mono text-[13px] font-medium">{opcao.label}</span>
                <span className="flex items-center gap-2 text-xs">
                  <span className="h-1 w-14 overflow-hidden rounded-full bg-[#e9efed]">
                    <span
                      className="block h-full bg-[var(--accent)]"
                      style={{ width: `${opcao.progress}%` }}
                    />
                  </span>
                  <span className="text-[var(--muted)]">{opcao.progress}%</span>
                  <EstadoTag estado={opcao.estado} />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar build e commitar**

Run: `cd /Users/renanoliveira/dev/extrato-pronto/web && npm run build`
Expected: build OK (componentes ainda não usados — sem erro).

```bash
git add web/src/lib/competencias.ts web/src/components/competencia-selector.tsx
git commit -m "feat(painel): helpers de competência e seletor com dropdown"
```

---

### Task 6: Derivação de pendências (módulo puro)

**Files:**
- Create: `web/src/app/painel/derive.ts`

- [ ] **Step 1: Criar `derive.ts`**

Criar `web/src/app/painel/derive.ts`:

```ts
import { unwrapRelation } from "@/lib/supabase/relations";

export type ClienteComBancos = {
  id: string;
  razao_social: string;
  cnpj: string | null;
  cliente_bancos:
    | { id: string; banco_codigo: string | null; banco_nome: string | null }[]
    | null;
};

export type ExtratoDaCompetencia = {
  id: string;
  status: string;
  banco_nome: string | null;
  clientes: { razao_social: string } | { razao_social: string }[] | null;
};

export type PendenciaStatus = "falta" | "triagem" | "erro";

export type Pendencia = {
  key: string;
  cliente: string;
  cnpj: string | null;
  banco: string;
  status: PendenciaStatus;
  extratoId: string | null;
};

export function derivePendencias(
  clientes: ClienteComBancos[],
  extratos: ExtratoDaCompetencia[]
): { pendencias: Pendencia[]; recebidos: number; totalPares: number } {
  const pendencias: Pendencia[] = [];
  const usados = new Set<string>();
  let recebidos = 0;
  let totalPares = 0;

  for (const cliente of clientes) {
    const bancos = cliente.cliente_bancos ?? [];

    if (bancos.length === 0) {
      totalPares += 1;
      pendencias.push({
        key: cliente.id,
        cliente: cliente.razao_social,
        cnpj: cliente.cnpj,
        banco: "—",
        status: "falta",
        extratoId: null,
      });
      continue;
    }

    for (const banco of bancos) {
      totalPares += 1;
      const match = extratos.find((extrato) => {
        if (usados.has(extrato.id)) return false;
        const extratoCliente = unwrapRelation(extrato.clientes);
        return (
          extratoCliente?.razao_social === cliente.razao_social &&
          extrato.banco_nome === banco.banco_nome
        );
      });

      if (!match) {
        pendencias.push({
          key: `${cliente.id}-${banco.id}`,
          cliente: cliente.razao_social,
          cnpj: cliente.cnpj,
          banco: banco.banco_nome ?? "?",
          status: "falta",
          extratoId: null,
        });
        continue;
      }

      usados.add(match.id);
      recebidos += 1;

      if (match.status === "triagem" || match.status === "erro") {
        pendencias.push({
          key: `${cliente.id}-${banco.id}`,
          cliente: cliente.razao_social,
          cnpj: cliente.cnpj,
          banco: banco.banco_nome ?? "?",
          status: match.status,
          extratoId: match.id,
        });
      }
    }
  }

  // Extratos sem par cliente × banco (ex.: remetente não identificado em triagem)
  for (const extrato of extratos) {
    if (usados.has(extrato.id)) continue;
    if (extrato.status !== "triagem" && extrato.status !== "erro") continue;
    pendencias.push({
      key: extrato.id,
      cliente:
        unwrapRelation(extrato.clientes)?.razao_social ?? "Remetente não identificado",
      cnpj: null,
      banco: extrato.banco_nome ?? "?",
      status: extrato.status,
      extratoId: extrato.id,
    });
  }

  return { pendencias, recebidos, totalPares };
}

export function filterPendencias(
  pendencias: Pendencia[],
  f: string | undefined,
  q: string | undefined
): Pendencia[] {
  let result = pendencias;
  if (f === "falta" || f === "triagem" || f === "erro") {
    result = result.filter((p) => p.status === f);
  }
  if (q) {
    const needle = q.trim().toLowerCase();
    if (needle) {
      result = result.filter(
        (p) =>
          p.cliente.toLowerCase().includes(needle) ||
          (p.cnpj ?? "").replace(/\D/g, "").includes(needle.replace(/\D/g, "")) ||
          p.banco.toLowerCase().includes(needle)
      );
    }
  }
  return result;
}
```

Atenção ao detalhe do `usados.has(extrato.id)` dentro do `find`: evita que um mesmo extrato seja casado com dois pares (cliente com dois bancos de mesmo nome).
Atenção em `filterPendencias`: se `q` contém só letras, `needle.replace(/\D/g, "")` vira string vazia e `includes("")` é sempre true — por isso o filtro de CNPJ só ajuda quando há dígitos no `q`; os outros dois critérios (cliente/banco) seguram o caso alfabético. Comportamento aceito.

- [ ] **Step 2: Verificar build e commitar**

Run: `cd /Users/renanoliveira/dev/extrato-pronto/web && npm run build`
Expected: build OK.

```bash
git add web/src/app/painel/derive.ts
git commit -m "feat(painel): derivação pura de pendências por competência"
```

---

### Task 7: Painel por exceção (reescrita da página)

**Files:**
- Modify: `web/src/app/painel/page.tsx` (reescrita completa)

- [ ] **Step 1: Reescrever a página**

Substituir o conteúdo de `web/src/app/painel/page.tsx` por:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, SignOutButton } from "@/components/app-shell";
import { Card, StatCard } from "@/components/ui/card";
import {
  CompetenciaSelector,
  type CompetenciaOption,
} from "@/components/competencia-selector";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTablePager,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient, getUserEscritorioId } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/supabase/relations";
import { compLabel, compParam, parseCompParam } from "@/lib/competencias";
import { derivePendencias, filterPendencias } from "@/app/painel/derive";
import { signOutAction, uploadExtratoAction } from "@/app/painel/actions";
import { UploadForm } from "@/app/painel/upload-form";
import { ImportClientesForm } from "@/app/painel/import-clientes-form";

const PAGE_SIZE = 25;

function painelHref(params: {
  comp?: string;
  f?: string;
  q?: string;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (params.comp) sp.set("comp", params.comp);
  if (params.f) sp.set("f", params.f);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/painel?${qs}` : "/painel";
}

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ comp?: string; f?: string; q?: string; page?: string }>;
}) {
  const { comp, f, q, page } = await searchParams;
  const escritorioId = await getUserEscritorioId();
  if (!escritorioId) redirect("/login");

  const supabase = await createClient();

  const [
    { data: escritorio },
    { data: clientes },
    { data: competencias },
    { data: extratosTodos },
  ] = await Promise.all([
    supabase.from("escritorios").select("nome, slug").eq("id", escritorioId).single(),
    supabase
      .from("clientes")
      .select("id, razao_social, cnpj, cliente_bancos(id, banco_codigo, banco_nome)")
      .eq("escritorio_id", escritorioId)
      .eq("ativo", true)
      .order("razao_social"),
    supabase
      .from("competencias")
      .select("id, ano, mes")
      .eq("escritorio_id", escritorioId)
      .order("ano", { ascending: false })
      .order("mes", { ascending: false }),
    supabase
      .from("extratos")
      .select("competencia_id, status")
      .eq("escritorio_id", escritorioId),
  ]);

  const parsed = parseCompParam(comp);
  const ativa = competencias?.[0] ?? null;
  const selecionada =
    (parsed &&
      competencias?.find((c) => c.ano === parsed.ano && c.mes === parsed.mes)) ||
    ativa;

  const { data: extratos } = selecionada
    ? await supabase
        .from("extratos")
        .select(
          "id, status, canal, arquivo_nome, transacao_count, created_at, banco_nome, clientes(razao_social)"
        )
        .eq("escritorio_id", escritorioId)
        .eq("competencia_id", selecionada.id)
        .order("created_at", { ascending: false })
    : { data: [] as never[] };

  const { pendencias, recebidos, totalPares } = derivePendencias(
    clientes ?? [],
    extratos ?? []
  );

  const countFalta = pendencias.filter((p) => p.status === "falta").length;
  const countTriagem = pendencias.filter((p) => p.status === "triagem").length;
  const countErro = pendencias.filter((p) => p.status === "erro").length;

  const filtradas = filterPendencias(pendencias, f, q);
  const pageCount = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pageNum = Math.min(Math.max(1, Number(page) || 1), pageCount);
  const pagina = filtradas.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);

  const convertidos = (extratos ?? []).filter((e) => e.status === "convertido").length;
  const exportados = (extratos ?? []).filter((e) => e.status === "exportado").length;

  const selecionadaParam = selecionada
    ? compParam(selecionada.ano, selecionada.mes)
    : undefined;
  const selecionadaLabel = selecionada
    ? compLabel(selecionada.ano, selecionada.mes)
    : "—";

  const opcoes: CompetenciaOption[] = (competencias ?? []).map((c) => {
    const doMes = (extratosTodos ?? []).filter((e) => e.competencia_id === c.id);
    const exportadosMes = doMes.filter((e) => e.status === "exportado").length;
    const progress =
      totalPares > 0 ? Math.min(100, Math.round((doMes.length / totalPares) * 100)) : 0;
    const estado =
      c.id === ativa?.id
        ? "ativa"
        : totalPares > 0 && exportadosMes >= totalPares
          ? "fechada"
          : "aberta";
    return { param: compParam(c.ano, c.mes), label: compLabel(c.ano, c.mes), progress, estado };
  });

  const chips: Chip[] = [
    {
      label: "Todas",
      count: pendencias.length,
      href: painelHref({ comp: selecionadaParam, q }),
      active: !f,
    },
    {
      label: "Falta",
      count: countFalta,
      href: painelHref({ comp: selecionadaParam, f: "falta", q }),
      active: f === "falta",
    },
    {
      label: "Triagem",
      count: countTriagem,
      href: painelHref({ comp: selecionadaParam, f: "triagem", q }),
      active: f === "triagem",
      tone: "warn",
    },
    {
      label: "Erro",
      count: countErro,
      href: painelHref({ comp: selecionadaParam, f: "erro", q }),
      active: f === "erro",
      tone: "warn",
    },
  ];

  const recentes = (extratos ?? []).slice(0, 20);

  return (
    <AppShell
      office={{
        nome: escritorio?.nome ?? "Painel",
        meta: `${clientes?.length ?? 0} clientes ativos`,
      }}
      nav={[
        {
          label: "Operação",
          items: [
            { label: "Painel", href: "/painel", icon: "▦", active: true },
            { label: "Extratos", icon: "⇪", badge: countTriagem + countErro },
            { label: "Exportações", icon: "⇲" },
          ],
        },
        {
          label: "Cadastro",
          items: [
            { label: "Clientes", icon: "▤" },
            { label: "Configurações", icon: "⚙" },
          ],
        },
      ]}
      title="Painel"
      topbarExtra={
        <CompetenciaSelector opcoes={opcoes} selecionada={selecionadaParam ?? ""} />
      }
      signOut={<SignOutButton action={signOutAction} />}
    >
      <div className="space-y-6">
        {selecionada && ativa && selecionada.id !== ativa.id && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#f3e3b8] bg-[#fffbeb] px-4 py-2.5 text-[13px] text-[#92660a]">
            <span>
              Você está vendo <strong>{selecionadaLabel}</strong> — competência
              anterior.
            </span>
            <Link
              href={painelHref({ comp: compParam(ativa.ano, ativa.mes) })}
              className="font-semibold text-[var(--accent)]"
            >
              Voltar para a ativa ({compLabel(ativa.ano, ativa.mes)}) →
            </Link>
          </div>
        )}

        <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Recebidos"
            value={String(recebidos)}
            suffix={`/ ${totalPares}`}
            progress={totalPares > 0 ? (recebidos / totalPares) * 100 : 0}
          />
          <StatCard
            label="Convertidos"
            value={String(convertidos)}
            meta={
              recebidos > 0
                ? `${Math.round((convertidos / recebidos) * 100)}% do recebido`
                : undefined
            }
            metaTone="up"
          />
          <StatCard label="Exportados" value={String(exportados)} meta="Alterdata CSV" />
          <StatCard
            label="Pendências"
            value={String(pendencias.length)}
            meta={`${countTriagem} triagem · ${countFalta} falta · ${countErro} erro`}
            metaTone="warn"
          />
        </section>

        <div className="grid gap-3.5 lg:grid-cols-2">
          <Card
            title="Importar clientes"
            description="Planilha do escritório — uma linha por banco. Reimportar atualiza sem duplicar."
          >
            <ImportClientesForm />
          </Card>

          <Card
            title="Enviar extrato OFX"
            description="Upload manual para validar com a E2 antes dos webhooks Meta/e-mail."
          >
            <UploadForm
              clientes={(clientes ?? []).map((c) => ({
                id: c.id,
                label: c.razao_social,
                bancos: (c.cliente_bancos ?? []).map((b) => ({
                  codigo: b.banco_codigo,
                  nome: b.banco_nome,
                })),
              }))}
              action={uploadExtratoAction}
            />
          </Card>
        </div>

        <Card
          title="Pendências da competência"
          description={`${selecionadaLabel} — só o que precisa de ação: quem não mandou, o que travou.`}
          actions={
            <form method="get" action="/painel" className="flex items-center gap-2">
              {selecionadaParam && (
                <input type="hidden" name="comp" value={selecionadaParam} />
              )}
              {f && <input type="hidden" name="f" value={f} />}
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Buscar cliente, CNPJ ou banco…"
                className="w-56 rounded-[7px] border border-[var(--border)] bg-[#fafcfb] px-3 py-1.5 text-[13px] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </form>
          }
        >
          <div className="mb-3.5">
            <FilterChips chips={chips} />
          </div>

          {pagina.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              {pendencias.length === 0
                ? "Nenhuma pendência nesta competência. Tudo em dia."
                : "Nada encontrado com esses filtros."}
            </p>
          ) : (
            <>
              <DataTable>
                <DataTableHead>
                  <DataTableTh>Cliente</DataTableTh>
                  <DataTableTh>Banco</DataTableTh>
                  <DataTableTh>Status</DataTableTh>
                  <DataTableTh>Ação</DataTableTh>
                </DataTableHead>
                <DataTableBody>
                  {pagina.map((p) => (
                    <DataTableRow key={p.key}>
                      <DataTableTd className="font-semibold">{p.cliente}</DataTableTd>
                      <DataTableTd>{p.banco}</DataTableTd>
                      <DataTableTd>
                        <StatusBadge status={p.status} />
                      </DataTableTd>
                      <DataTableTd>
                        {p.status === "falta" ? (
                          <span className="text-[13px] text-[var(--muted)]">
                            Cobrar via WhatsApp (em breve)
                          </span>
                        ) : (
                          <Link
                            href={`/painel/extratos/${p.extratoId}`}
                            className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
                          >
                            {p.status === "triagem" ? "Identificar →" : "Ver detalhe →"}
                          </Link>
                        )}
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
              <DataTablePager
                page={pageNum}
                pageCount={pageCount}
                total={filtradas.length}
                label={`Mostrando ${(pageNum - 1) * PAGE_SIZE + 1}–${Math.min(
                  pageNum * PAGE_SIZE,
                  filtradas.length
                )} de ${filtradas.length} pendências`}
                hrefForPage={(p) =>
                  painelHref({ comp: selecionadaParam, f, q, page: p })
                }
              />
            </>
          )}
        </Card>

        <Card
          title="Extratos recentes"
          description={`Últimos extratos de ${selecionadaLabel}`}
        >
          {recentes.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              Nenhum extrato nesta competência. Envie um OFX acima ou via webhook.
            </p>
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableTh>Status</DataTableTh>
                <DataTableTh>Cliente</DataTableTh>
                <DataTableTh>Detalhes</DataTableTh>
                <DataTableTh>Recebido em</DataTableTh>
                <DataTableTh></DataTableTh>
              </DataTableHead>
              <DataTableBody>
                {recentes.map((extrato) => {
                  const cliente = unwrapRelation(extrato.clientes);
                  return (
                    <DataTableRow key={extrato.id}>
                      <DataTableTd>
                        <StatusBadge status={extrato.status} />
                      </DataTableTd>
                      <DataTableTd className="font-semibold">
                        {cliente?.razao_social ?? "Remetente não identificado"}
                      </DataTableTd>
                      <DataTableTd className="text-[var(--muted-foreground)]">
                        {extrato.banco_nome ?? "banco ?"} · {extrato.canal} ·{" "}
                        {extrato.transacao_count} tx
                      </DataTableTd>
                      <DataTableTd className="whitespace-nowrap font-mono text-xs text-[var(--muted)]">
                        {new Date(extrato.created_at).toLocaleString("pt-BR")}
                      </DataTableTd>
                      <DataTableTd align="right">
                        <Link
                          href={`/painel/extratos/${extrato.id}`}
                          className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
                        >
                          Ver →
                        </Link>
                      </DataTableTd>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `cd /Users/renanoliveira/dev/extrato-pronto/web && npm run build`
Expected: build OK. Se o tipo do retorno de `extratos` (ternário com `{ data: [] as never[] }`) reclamar, trocar por consulta incondicional com `.eq("competencia_id", selecionada?.id ?? "00000000-0000-0000-0000-000000000000")` **não** — preferir: extrair a consulta para `if (selecionada) { ... }` com variável `let extratos: ExtratoRow[] = []`.

- [ ] **Step 3: Verificação manual**

Run: `npm run dev`, abrir `http://localhost:3001/painel`. Conferir:
1. Stats com barra de progresso em "Recebidos".
2. Chips filtram (URL muda para `?f=falta` etc.) e contagens batem.
3. Busca por nome de cliente funciona (Enter no input).
4. Seletor de competência: setas e dropdown trocam `?comp=`; banner âmbar aparece ao ver competência antiga; "Voltar para a ativa" funciona.
5. Para exercitar a paginação sem volume real: mudar `PAGE_SIZE` para `2` temporariamente, conferir pager (números, link preserva `f`/`q`/`comp`), reverter para `25`.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/painel/page.tsx
git commit -m "feat(painel): painel por exceção com filtros, busca, paginação e seletor de competência"
```

---

### Task 8: Login restyle

**Files:**
- Modify: `web/src/app/login/page.tsx`

- [ ] **Step 1: Ajustes pontuais**

Em `web/src/app/login/page.tsx`:

1. Trocar o bloco do logo (div `mx-auto mb-4 flex h-12 w-12 ...`) por:

```tsx
<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#15705f] to-[var(--accent)] text-base font-bold text-white shadow-md">
  EP
</div>
```

2. No card do formulário, trocar `rounded-xl` por `rounded-[10px]`.
3. No `<code>` do rodapé e do erro `sem-escritorio`, nada muda (usam vars que já apontam para os novos tokens).

- [ ] **Step 2: Verificar build/visual e commitar**

Run: `cd /Users/renanoliveira/dev/extrato-pronto/web && npm run build`
Expected: build OK. Visual: `http://localhost:3001/login` com nova fonte/cores.

```bash
git add web/src/app/login/page.tsx
git commit -m "feat(design): login com nova identidade"
```

---

### Task 9: Verificação final contra os critérios de aceite

**Files:** nenhum (verificação)

- [ ] **Step 1: Lint e build limpos**

Run: `cd /Users/renanoliveira/dev/extrato-pronto/web && npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 2: Checklist manual (criterios do spec)**

Com `npm run dev` e Supabase local:

1. Painel: sidebar escura, topbar com seletor de competência via `?comp=`, stats com progresso. ✓/✗
2. Pendências: chips + busca + paginação (testada com `PAGE_SIZE=2` na Task 7). ✓/✗
3. Regressões: upload OFX processa; import de clientes roda; link "Ver detalhe" abre extrato; "Sair" desloga. ✓/✗
4. Login e `/admin` (+ `/admin/escritorios/novo` e `/admin/escritorios/[id]`) com a nova identidade. ✓/✗
5. `grep -rn "#0c6464\|jakarta" web/src` não retorna nada (paleta/fonte antigas removidas). ✓/✗

- [ ] **Step 3: Reportar resultado ao usuário**

Listar o que passou/falhou. Se algo falhou, corrigir antes de dar a tarefa por concluída (usar superpowers:systematic-debugging para qualquer comportamento inesperado).
