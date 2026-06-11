const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  convertido: {
    label: "Convertido",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  },
  exportado: {
    label: "Exportado",
    className: "bg-violet-50 text-violet-800 ring-violet-600/20",
  },
  recebido: {
    label: "Recebido",
    className: "bg-sky-50 text-sky-800 ring-sky-600/20",
  },
  processando: {
    label: "Processando",
    className: "bg-amber-50 text-amber-800 ring-amber-600/20",
  },
  duplicado: {
    label: "Duplicado",
    className: "bg-slate-100 text-slate-700 ring-slate-500/20",
  },
  erro: {
    label: "Erro",
    className: "bg-red-50 text-red-800 ring-red-600/20",
  },
  triagem: {
    label: "Triagem",
    className: "bg-orange-50 text-orange-800 ring-orange-600/20",
  },
  falta: {
    label: "Falta",
    className: "bg-slate-50 text-slate-600 ring-slate-400/20",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-700 ring-slate-500/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}
