"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, selectClassName } from "@/components/ui/field";

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
  const semClientes = clientes.length === 0;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    const result = await action(formData);
    setMessage(result.message);
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {semClientes ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Nenhum cliente cadastrado — você ainda pode enviar OFX; o extrato entra em{" "}
          <strong>triagem</strong> até importar clientes via CSV acima.
        </p>
      ) : null}

      <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
        A competência é inferida automaticamente das datas do OFX (mesmo fluxo do webhook).
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" hint={semClientes ? "Opcional sem cadastro" : undefined}>
          {semClientes ? (
            <input type="hidden" name="cliente_id" value="" />
          ) : (
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
          )}
          {semClientes && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Importe o{" "}
              <a href="/template-import-clientes.csv" download className="text-[var(--accent)]">
                template CSV
              </a>{" "}
              para converter automaticamente.
            </p>
          )}
        </Field>

        <Field
          label="Banco"
          hint={semClientes || bancos.length === 0 ? "Opcional — inferido do OFX se possível" : undefined}
        >
          {bancos.length > 0 ? (
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
          ) : (
            <>
              <input type="hidden" name="banco_codigo" value="" />
              <p className="text-sm text-[var(--muted)]">—</p>
            </>
          )}
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
