import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient, getUserEscritorioId } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/supabase/relations";
import { ExportAlterdataButton } from "@/app/painel/extratos/[id]/export-button";

export default async function ExtratoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const escritorioId = await getUserEscritorioId();
  if (!escritorioId) redirect("/login");

  const supabase = await createClient();
  const { data: extrato } = await supabase
    .from("extratos")
    .select(
      "id, status, arquivo_nome, transacao_count, banco_nome, created_at, clientes(razao_social), competencias(ano, mes)"
    )
    .eq("id", id)
    .eq("escritorio_id", escritorioId)
    .maybeSingle();

  if (!extrato) notFound();

  const { data: transacoes } = await supabase
    .from("transacoes")
    .select("data, valor, descricao, tipo")
    .eq("extrato_id", id)
    .order("data", { ascending: true });

  const cliente = unwrapRelation(extrato.clientes);
  const comp = unwrapRelation(extrato.competencias);

  return (
    <AppShell
      office={{ nome: "Extrato Pronto" }}
      nav={[
        {
          items: [{ label: "← Voltar ao painel", href: "/painel", icon: "▦" }],
        },
      ]}
      title={`${cliente?.razao_social ?? "Remetente não identificado"} · ${extrato.banco_nome ?? "?"}`}
      topbarExtra={
        <span className="hidden truncate font-mono text-xs text-[var(--muted)] sm:inline">
          {extrato.arquivo_nome} · {comp ? `${String(comp.mes).padStart(2, "0")}/${comp.ano}` : "?"} ·{" "}
          {extrato.transacao_count} tx
        </span>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
          <StatusBadge status={extrato.status} />
          <p className="text-sm text-[var(--muted-foreground)]">
            Recebido em{" "}
            <span className="font-medium text-[var(--foreground)]">
              {new Date(extrato.created_at).toLocaleString("pt-BR")}
            </span>
          </p>

          {(extrato.status === "convertido" || extrato.status === "exportado") && (
            <div className="ml-auto flex items-center gap-3">
              <ExportAlterdataButton extratoId={id} />
              {extrato.status === "exportado" && (
                <span className="text-sm font-medium text-emerald-700">
                  Já exportado para Alterdata
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-base font-semibold text-[var(--foreground)]">
            Transações convertidas
          </h2>
          <DataTable>
            <DataTableHead>
              <DataTableTh>Data</DataTableTh>
              <DataTableTh>Descrição</DataTableTh>
              <DataTableTh>Tipo</DataTableTh>
              <DataTableTh align="right">Valor</DataTableTh>
            </DataTableHead>
            <DataTableBody>
              {(transacoes ?? []).map((tx, i) => (
                <DataTableRow key={i}>
                  <DataTableTd className="whitespace-nowrap font-medium">
                    {new Date(tx.data).toLocaleDateString("pt-BR")}
                  </DataTableTd>
                  <DataTableTd>{tx.descricao}</DataTableTd>
                  <DataTableTd>
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${
                        tx.tipo === "C"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {tx.tipo === "C" ? "Crédito" : "Débito"}
                    </span>
                  </DataTableTd>
                  <DataTableTd
                    align="right"
                    className="font-mono text-[15px] font-medium tabular-nums"
                  >
                    {Number(tx.valor).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      </div>
    </AppShell>
  );
}
