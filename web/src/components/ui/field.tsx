import { type ReactNode } from "react";

const controlClass =
  "mt-1.5 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--foreground)] shadow-sm transition-colors placeholder:text-slate-400 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20";

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-[var(--foreground)]"
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs text-[var(--muted)]">{hint}</p>
      )}
    </div>
  );
}

export function inputClassName() {
  return controlClass;
}

export function selectClassName() {
  return controlClass;
}
