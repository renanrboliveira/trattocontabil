"use client";

import Link from "next/link";
import { useState } from "react";

export type CompetenciaOption = {
  param: string; // "2026-05"
  label: string; // "05/2026"
  progress: number; // 0-100
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
        <Link href={`/painel?comp=${maisAntiga.param}`} className={arrowClass} aria-label="Competencia anterior">
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
        <Link href={`/painel?comp=${maisRecente.param}`} className={arrowClass} aria-label="Proxima competencia">
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
              Competencias
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
