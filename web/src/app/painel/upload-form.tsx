"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClassName, selectClassName } from "@/components/ui/field";

type ClienteOption = {
  id: string;
  label: string;
  bancos: Array<{ codigo: string; nome: string }>;
};

export function UploadForm({
  clientes,
  action,
}: {
  clientes: ClienteOption[];
  action: (formData: FormData) => Promise<{
    ok: boolean;
    message: string;
    status?: string;
    transacaoCount?: number;
  }>;
}) {
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = clientes.find((c) => c.id === clienteId);
  const bancos = selected?.bancos ?? [];

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    const result = await action(formData);
    setMessage(result.message);
    setLoading(false);
  }

  if (clientes.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Importe clientes via CSV antes de enviar extratos.
      </p>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente">
          <select
            name="cliente_id"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className={selectClassName()}
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Banco">
          <select
            name="banco_codigo"
            className={selectClassName()}
            defaultValue={bancos[0]?.codigo}
          >
            {bancos.map((b) => (
              <option key={b.codigo} value={b.codigo}>
                {b.nome}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Competência" hint="Formato AAAA-MM, ex.: 2026-07">
          <input
            name="competencia"
            placeholder="2026-07"
            pattern="\d{4}-\d{2}"
            className={inputClassName()}
          />
        </Field>

        <Field label="Arquivo OFX">
          <input
            name="file"
            type="file"
            accept=".ofx,.qfx"
            required
            className="block w-full text-sm text-[var(--muted-foreground)] file:mr-3"
          />
        </Field>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Processando…" : "Enviar e converter"}
      </Button>

      {message && (
        <p className="rounded-lg border border-[var(--border)] bg-slate-50 px-4 py-3 text-sm text-[var(--foreground)]">
          {message}
        </p>
      )}
    </form>
  );
}
