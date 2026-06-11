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
