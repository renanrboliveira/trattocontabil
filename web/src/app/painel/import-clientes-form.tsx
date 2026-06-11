"use client";

import { useState } from "react";
import type { ImportPreview } from "@/lib/import/clientes-csv";
import {
  applyClientesImportAction,
  previewClientesImportAction,
} from "@/app/painel/actions";
import { Button } from "@/components/ui/button";

type ApplyResult = {
  status: "completed" | "partial" | "failed";
  clientesCriados: number;
  clientesAtualizados: number;
  bancosCriados: number;
  bancosAtualizados: number;
  errors: Array<{ line: number; message: string }>;
};

export function ImportClientesForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setMessage(null);
    setApplyResult(null);

    const formData = new FormData();
    formData.set("file", file);
    const result = await previewClientesImportAction(formData);

    setLoading(false);
    if (!result.ok) {
      setMessage(result.message);
      setPreview(null);
      return;
    }
    setPreview(result.preview);
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.set("file", file);
    const result = await applyClientesImportAction(formData);

    setLoading(false);
    if (!result.ok) {
      setMessage(result.message ?? "Erro no import");
      return;
    }
    setApplyResult(result.result);
    setPreview(null);
    setFile(null);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
        Importe a planilha que o escritório já usa (Alterdata, Excel, etc.).{" "}
        <a
          href="/template-import-clientes.csv"
          download
          className="font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
        >
          Baixar template CSV
        </a>
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="block text-sm font-semibold text-[var(--foreground)]">
            Arquivo CSV
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            className="mt-1.5 block w-full text-sm text-[var(--muted-foreground)]"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setApplyResult(null);
              setMessage(null);
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={!file || loading}
          onClick={handlePreview}
        >
          {loading ? "Validando…" : "Validar preview"}
        </Button>
        <Button
          type="button"
          disabled={!preview || preview.rows.length === 0 || loading}
          onClick={handleImport}
        >
          Confirmar import
        </Button>
      </div>

      {message && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {message}
        </p>
      )}

      {preview && (
        <div className="rounded-lg border border-[var(--border)] bg-slate-50/80 p-4 text-sm">
          <p className="font-semibold text-[var(--foreground)]">Preview da validação</p>
          <ul className="mt-3 grid gap-1.5 text-[var(--muted-foreground)] sm:grid-cols-2">
            <li>
              <span className="font-semibold text-[var(--foreground)]">
                {preview.stats.validLines}
              </span>{" "}
              linhas válidas
            </li>
            <li>
              <span className="font-semibold text-[var(--foreground)]">
                {preview.stats.uniqueClientes}
              </span>{" "}
              clientes (CNPJs únicos)
            </li>
            <li>
              <span className="font-semibold text-[var(--foreground)]">
                {preview.stats.bancoRows}
              </span>{" "}
              linhas com banco
            </li>
            {preview.errors.length > 0 && (
              <li className="text-orange-700">
                {preview.errors.length} erro(s) — linhas ignoradas
              </li>
            )}
          </ul>
          {preview.errors.length > 0 && (
            <ul className="mt-3 max-h-32 overflow-y-auto rounded-md border border-orange-200 bg-orange-50/50 p-3 text-xs text-orange-900">
              {preview.errors.slice(0, 10).map((err, i) => (
                <li key={i}>
                  Linha {err.line}: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {applyResult && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">
            Import concluído ({applyResult.status})
          </p>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            <li>{applyResult.clientesCriados} clientes criados</li>
            <li>{applyResult.clientesAtualizados} clientes atualizados</li>
            <li>{applyResult.bancosCriados} bancos criados</li>
            <li>{applyResult.bancosAtualizados} bancos atualizados</li>
          </ul>
          {applyResult.errors.length > 0 && (
            <p className="mt-3 text-orange-800">
              {applyResult.errors.length} aviso(s) — ver histórico de imports
            </p>
          )}
        </div>
      )}
    </div>
  );
}
