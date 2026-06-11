import { type ReactNode } from "react";

export function Card({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] ${className}`}
    >
      <div className="mb-5 border-b border-[var(--border)] pb-4">
        <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "teal" | "emerald" | "amber" | "slate";
}) {
  const accents = {
    teal: "border-l-[var(--accent)]",
    emerald: "border-l-emerald-500",
    amber: "border-l-amber-500",
    slate: "border-l-slate-400",
  };

  return (
    <div
      className={`rounded-xl border border-[var(--border)] border-l-4 bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] ${accents[accent ?? "slate"]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
