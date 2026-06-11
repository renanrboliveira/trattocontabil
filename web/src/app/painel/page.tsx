import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, SignOutButton } from "@/components/app-shell";
import { Card, StatCard } from "@/components/ui/card";
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
import { signOutAction, uploadExtratoAction } from "@/app/painel/actions";
import { UploadForm } from "@/app/painel/upload-form";
import { ImportClientesForm } from "@/app/painel/import-clientes-form";

export default async function PainelPage() {
  const escritorioId = await getUserEscritorioId();
  if (!escritorioId) redirect("/login");

  const supabase = await createClient();

  const [
    { data: escritorio },
    { data: clientes },
    { data: extratos },
    { data: competencias },
  ] = await Promise.all([
    supabase.from("escritorios").select("nome, slug").eq("id", escritorioId).single(),
    supabase
      .from("clientes")
      .select("id, razao_social, cnpj, cliente_bancos(id, banco_codigo, banco_nome)")
      .eq("escritorio_id", escritorioId)
      .eq("ativo", true)
      .order("razao_social"),
    supabase
      .from("extratos")
      .select(
        "id, status, canal, arquivo_nome, transacao_count, created_at, banco_nome, clientes(razao_social), competencias(ano, mes)"
      )
      .eq("escritorio_id", escritorioId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("competencias")
      .select("id, ano, mes")
      .eq("escritorio_id", escritorioId)
      .order("ano", { ascending: false })
      .order("mes", { ascending: false }),
  ]);

  const competenciaAtual = competencias?.[0];
  const competenciaLabel = competenciaAtual
    ? `${String(competenciaAtual.mes).padStart(2, "0")}/${competenciaAtual.ano}`
    : "—";

  const convertidos = extratos?.filter((e) => e.status === "convertido").length ?? 0;
  const triagem = extratos?.filter((e) => e.status === "triagem").length ?? 0;
  const exportados = extratos?.filter((e) => e.status === "exportado").length ?? 0;

  return (
    <AppShell
      eyebrow="Extrato Pronto"
      title={escritorio?.nome ?? "Painel"}
      subtitle={`Competência ${competenciaLabel} · piloto E2`}
      actions={<SignOutButton action={signOutAction} />}
    >
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Competência ativa" value={competenciaLabel} accent="teal" />
          <StatCard label="Convertidos" value={String(convertidos)} accent="emerald" />
          <StatCard label="Exportados" value={String(exportados)} accent="slate" />
          <StatCard label="Aguardando triagem" value={String(triagem)} accent="amber" />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="Importar clientes"
            description="Suba a planilha do escritório — uma linha por banco. Reimportar atualiza sem duplicar."
          >
            <ImportClientesForm />
          </Card>

          <Card
            title="Enviar extrato OFX"
            description="Upload manual para validar com a E2 antes dos webhooks Meta/e-mail estarem configurados."
          >
            <UploadForm
              clientes={(clientes ?? []).map((c) => ({
                id: c.id,
                label: c.razao_social,
                bancos: (c.cliente_bancos ?? []).map((b) => ({
                  codigo: b.banco_codigo,
                  nome: b.banco_nome,
                })),
              }))}
              action={uploadExtratoAction}
            />
          </Card>
        </div>

        <Card
          title="Matriz cliente × banco"
          description={`Competência ${competenciaLabel} — status por extrato recebido`}
        >
          <DataTable>
            <DataTableHead>
              <DataTableTh>Cliente</DataTableTh>
              <DataTableTh>Banco</DataTableTh>
              <DataTableTh>Status</DataTableTh>
            </DataTableHead>
            <DataTableBody>
              {(clientes ?? []).flatMap((cliente) => {
                const bancos = cliente.cliente_bancos ?? [];
                if (bancos.length === 0) {
                  return [
                    <DataTableRow key={cliente.id}>
                      <DataTableTd className="font-medium">
                        {cliente.razao_social}
                      </DataTableTd>
                      <DataTableTd className="text-[var(--muted)]">—</DataTableTd>
                      <DataTableTd>
                        <StatusBadge status="falta" />
                      </DataTableTd>
                    </DataTableRow>,
                  ];
                }
                return bancos.map((banco) => {
                  const match = extratos?.find((e) => {
                    const extratoCliente = unwrapRelation(e.clientes);
                    return (
                      extratoCliente?.razao_social === cliente.razao_social &&
                      e.banco_nome === banco.banco_nome
                    );
                  });
                  const status = match?.status ?? "falta";
                  return (
                    <DataTableRow key={`${cliente.id}-${banco.id}`}>
                      <DataTableTd className="font-medium">
                        {cliente.razao_social}
                      </DataTableTd>
                      <DataTableTd>{banco.banco_nome}</DataTableTd>
                      <DataTableTd>
                        <StatusBadge status={status} />
                      </DataTableTd>
                    </DataTableRow>
                  );
                });
              })}
            </DataTableBody>
          </DataTable>
        </Card>

        <Card
          title="Extratos recentes"
          description="Últimos 20 extratos recebidos pelo escritório"
        >
          {(extratos ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              Nenhum extrato ainda. Envie um OFX acima ou via webhook.
            </p>
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableTh>Status</DataTableTh>
                <DataTableTh>Cliente</DataTableTh>
                <DataTableTh>Detalhes</DataTableTh>
                <DataTableTh>Recebido em</DataTableTh>
                <DataTableTh></DataTableTh>
              </DataTableHead>
              <DataTableBody>
                {(extratos ?? []).map((extrato) => {
                  const cliente = unwrapRelation(extrato.clientes);
                  const comp = unwrapRelation(extrato.competencias);
                  return (
                    <DataTableRow key={extrato.id}>
                      <DataTableTd>
                        <StatusBadge status={extrato.status} />
                      </DataTableTd>
                      <DataTableTd className="font-medium">
                        {cliente?.razao_social ?? "Remetente não identificado"}
                      </DataTableTd>
                      <DataTableTd className="text-[var(--muted-foreground)]">
                        {extrato.banco_nome ?? "banco ?"} · {extrato.canal} ·{" "}
                        {comp
                          ? `${String(comp.mes).padStart(2, "0")}/${comp.ano}`
                          : "?"}{" "}
                        · {extrato.transacao_count} tx
                      </DataTableTd>
                      <DataTableTd className="whitespace-nowrap text-[var(--muted)]">
                        {new Date(extrato.created_at).toLocaleString("pt-BR")}
                      </DataTableTd>
                      <DataTableTd align="right">
                        <Link
                          href={`/painel/extratos/${extrato.id}`}
                          className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
                        >
                          Ver →
                        </Link>
                      </DataTableTd>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
