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
