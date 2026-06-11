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
