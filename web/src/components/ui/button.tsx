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
