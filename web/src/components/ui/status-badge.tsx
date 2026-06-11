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
