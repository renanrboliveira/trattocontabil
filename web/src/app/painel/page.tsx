import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, SignOutButton } from "@/components/app-shell";
import { Card, StatCard } from "@/components/ui/card";
import {
  CompetenciaSelector,
  type CompetenciaOption,
} from "@/components/competencia-selector";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTablePager,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient, getUserEscritorioId } from "@/lib/supabase/server";
import { unwrapRelation } from "@/lib/supabase/relations";
import { compLabel, compParam, parseCompParam } from "@/lib/competencias";
import { derivePendencias, filterPendencias } from "@/app/painel/derive";
import { signOutAction, uploadExtratoAction } from "@/app/painel/actions";
import { UploadForm } from "@/app/painel/upload-form";
import { ImportClientesForm } from "@/app/painel/import-clientes-form";

const PAGE_SIZE = 25;

function painelHref(params: {
  comp?: string;
  f?: string;
  q?: string;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (params.comp) sp.set("comp", params.comp);
  if (params.f) sp.set("f", params.f);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/painel?${qs}` : "/painel";
}

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ comp?: string; f?: string; q?: string; page?: string }>;
}) {
  const { comp, f, q, page } = await searchParams;
  const escritorioId = await getUserEscritorioId();
  if (!escritorioId) redirect("/login");

  const supabase = await createClient();

  const [
    { data: escritorio },
    { data: clientes },
    { data: competencias },
    { data: extratosTodos },
  ] = await Promise.all([
    supabase.from("escritorios").select("nome, slug").eq("id", escritorioId).single(),
    supabase
      .from("clientes")
      .select("id, razao_social, cnpj, cliente_bancos(id, banco_codigo, banco_nome)")
      .eq("escritorio_id", escritorioId)
      .eq("ativo", true)
      .order("razao_social"),
    supabase
      .from("competencias")
      .select("id, ano, mes")
      .eq("escritorio_id", escritorioId)
      .order("ano", { ascending: false })
      .order("mes", { ascending: false }),
    supabase
      .from("extratos")
      .select("competencia_id, status")
      .eq("escritorio_id", escritorioId),
  ]);

  const parsed = parseCompParam(comp);
  const ativa = competencias?.[0] ?? null;
  const selecionada =
    (parsed &&
      competencias?.find((c) => c.ano === parsed.ano && c.mes === parsed.mes)) ||
    ativa;

  let extratos: {
    id: string;
    status: string;
    canal: string;
    arquivo_nome: string;
    transacao_count: number;
    created_at: string;
    banco_nome: string | null;
    clientes: { razao_social: string } | { razao_social: string }[] | null;
  }[] = [];
  if (selecionada) {
    const { data } = await supabase
      .from("extratos")
      .select(
        "id, status, canal, arquivo_nome, transacao_count, created_at, banco_nome, clientes(razao_social)"
      )
      .eq("escritorio_id", escritorioId)
      .eq("competencia_id", selecionada.id)
      .order("created_at", { ascending: false });
    extratos = data ?? [];
  }

  const { pendencias, recebidos, totalPares } = derivePendencias(
    clientes ?? [],
    extratos
  );

  const countFalta = pendencias.filter((p) => p.status === "falta").length;
  const countTriagem = pendencias.filter((p) => p.status === "triagem").length;
  const countErro = pendencias.filter((p) => p.status === "erro").length;

  const filtradas = filterPendencias(pendencias, f, q);
  const pageCount = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pageNum = Math.min(Math.max(1, Number(page) || 1), pageCount);
  const pagina = filtradas.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);

  const convertidos = extratos.filter((e) => e.status === "convertido").length;
  const exportados = extratos.filter((e) => e.status === "exportado").length;

  const selecionadaParam = selecionada
    ? compParam(selecionada.ano, selecionada.mes)
    : undefined;
  const selecionadaLabel = selecionada
    ? compLabel(selecionada.ano, selecionada.mes)
    : "—";

  const opcoes: CompetenciaOption[] = (competencias ?? []).map((c) => {
    const doMes = (extratosTodos ?? []).filter((e) => e.competencia_id === c.id);
    const exportadosMes = doMes.filter((e) => e.status === "exportado").length;
    const progress =
      totalPares > 0 ? Math.min(100, Math.round((doMes.length / totalPares) * 100)) : 0;
    const estado =
      c.id === ativa?.id
        ? ("ativa" as const)
        : totalPares > 0 && exportadosMes >= totalPares
          ? ("fechada" as const)
          : ("aberta" as const);
    return { param: compParam(c.ano, c.mes), label: compLabel(c.ano, c.mes), progress, estado };
  });

  const chips: Chip[] = [
    {
      label: "Todas",
      count: pendencias.length,
      href: painelHref({ comp: selecionadaParam, q }),
      active: !f,
    },
    {
      label: "Falta",
      count: countFalta,
      href: painelHref({ comp: selecionadaParam, f: "falta", q }),
      active: f === "falta",
    },
    {
      label: "Triagem",
      count: countTriagem,
      href: painelHref({ comp: selecionadaParam, f: "triagem", q }),
      active: f === "triagem",
      tone: "warn",
    },
    {
      label: "Erro",
      count: countErro,
      href: painelHref({ comp: selecionadaParam, f: "erro", q }),
      active: f === "erro",
      tone: "warn",
    },
  ];

  const recentes = extratos.slice(0, 20);

  return (
    <AppShell
      office={{
        nome: escritorio?.nome ?? "Painel",
        meta: `${clientes?.length ?? 0} clientes ativos`,
      }}
      nav={[
        {
          label: "Operação",
          items: [
            { label: "Painel", href: "/painel", icon: "▦", active: true },
            { label: "Extratos", icon: "⇪", badge: countTriagem + countErro },
            { label: "Exportações", icon: "⇲" },
          ],
        },
        {
          label: "Cadastro",
          items: [
            { label: "Clientes", icon: "▤" },
            { label: "Configurações", icon: "⚙" },
          ],
        },
      ]}
      title="Painel"
      topbarExtra={
        <CompetenciaSelector opcoes={opcoes} selecionada={selecionadaParam ?? ""} />
      }
      signOut={<SignOutButton action={signOutAction} />}
    >
      <div className="space-y-6">
        {selecionada && ativa && selecionada.id !== ativa.id && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#f3e3b8] bg-[#fffbeb] px-4 py-2.5 text-[13px] text-[#92660a]">
            <span>
              Você está vendo <strong>{selecionadaLabel}</strong> — competência
              anterior.
            </span>
            <Link
              href={painelHref({ comp: compParam(ativa.ano, ativa.mes) })}
              className="font-semibold text-[var(--accent)]"
            >
              Voltar para a ativa ({compLabel(ativa.ano, ativa.mes)}) →
            </Link>
          </div>
        )}

        <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Recebidos"
            value={String(recebidos)}
            suffix={`/ ${totalPares}`}
            progress={totalPares > 0 ? (recebidos / totalPares) * 100 : 0}
          />
          <StatCard
            label="Convertidos"
            value={String(convertidos)}
            meta={
              recebidos > 0
                ? `${Math.round((convertidos / recebidos) * 100)}% do recebido`
                : undefined
            }
            metaTone="up"
          />
          <StatCard label="Exportados" value={String(exportados)} meta="Alterdata CSV" />
          <StatCard
            label="Pendências"
            value={String(pendencias.length)}
            meta={`${countTriagem} triagem · ${countFalta} falta · ${countErro} erro`}
            metaTone="warn"
          />
        </section>

        <div className="grid gap-3.5 lg:grid-cols-2">
          <Card
            title="Importar clientes"
            description="Planilha do escritório — uma linha por banco. Reimportar atualiza sem duplicar."
          >
            <ImportClientesForm />
          </Card>

          <Card
            title="Enviar extrato OFX"
            description="Upload manual para validar com a E2 antes dos webhooks Meta/e-mail."
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
          title="Pendências da competência"
          description={`${selecionadaLabel} — só o que precisa de ação: quem não mandou, o que travou.`}
          actions={
            <form method="get" action="/painel" className="flex items-center gap-2">
              {selecionadaParam && (
                <input type="hidden" name="comp" value={selecionadaParam} />
              )}
              {f && <input type="hidden" name="f" value={f} />}
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Buscar cliente, CNPJ ou banco…"
                className="w-56 rounded-[7px] border border-[var(--border)] bg-[#fafcfb] px-3 py-1.5 text-[13px] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </form>
          }
        >
          <div className="mb-3.5">
            <FilterChips chips={chips} />
          </div>

          {pagina.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              {pendencias.length === 0
                ? "Nenhuma pendência nesta competência. Tudo em dia."
                : "Nada encontrado com esses filtros."}
            </p>
          ) : (
            <>
              <DataTable>
                <DataTableHead>
                  <DataTableTh>Cliente</DataTableTh>
                  <DataTableTh>Banco</DataTableTh>
                  <DataTableTh>Status</DataTableTh>
                  <DataTableTh>Ação</DataTableTh>
                </DataTableHead>
                <DataTableBody>
                  {pagina.map((p) => (
                    <DataTableRow key={p.key}>
                      <DataTableTd className="font-semibold">{p.cliente}</DataTableTd>
                      <DataTableTd>{p.banco}</DataTableTd>
                      <DataTableTd>
                        <StatusBadge status={p.status} />
                      </DataTableTd>
                      <DataTableTd>
                        {p.status === "falta" ? (
                          <span className="text-[13px] text-[var(--muted)]">
                            Cobrar via WhatsApp (em breve)
                          </span>
                        ) : (
                          <Link
                            href={`/painel/extratos/${p.extratoId}`}
                            className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
                          >
                            {p.status === "triagem" ? "Identificar →" : "Ver detalhe →"}
                          </Link>
                        )}
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
              <DataTablePager
                page={pageNum}
                pageCount={pageCount}
                total={filtradas.length}
                label={`Mostrando ${(pageNum - 1) * PAGE_SIZE + 1}–${Math.min(
                  pageNum * PAGE_SIZE,
                  filtradas.length
                )} de ${filtradas.length} pendências`}
                hrefForPage={(p) =>
                  painelHref({ comp: selecionadaParam, f, q, page: p })
                }
              />
            </>
          )}
        </Card>

        <Card
          title="Extratos recentes"
          description={`Últimos extratos de ${selecionadaLabel}`}
        >
          {recentes.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              Nenhum extrato nesta competência. Envie um OFX acima ou via webhook.
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
                {recentes.map((extrato) => {
                  const cliente = unwrapRelation(extrato.clientes);
                  return (
                    <DataTableRow key={extrato.id}>
                      <DataTableTd>
                        <StatusBadge status={extrato.status} />
                      </DataTableTd>
                      <DataTableTd className="font-semibold">
                        {cliente?.razao_social ?? "Remetente não identificado"}
                      </DataTableTd>
                      <DataTableTd className="text-[var(--muted-foreground)]">
                        {extrato.banco_nome ?? "banco ?"} · {extrato.canal} ·{" "}
                        {extrato.transacao_count} tx
                      </DataTableTd>
                      <DataTableTd className="whitespace-nowrap font-mono text-xs text-[var(--muted)]">
                        {new Date(extrato.created_at).toLocaleString("pt-BR")}
                      </DataTableTd>
                      <DataTableTd align="right">
                        <Link
                          href={`/painel/extratos/${extrato.id}`}
                          className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
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
