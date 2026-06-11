# Etapa 0 — checklist "pronto para codar"

> Referência: `docs/plano-piloto.md` §4.0.
> **Escopo:** E2 only · competência 1 = jul/2026 · deadline interno: **2026-06-30**
> **Kick-off E2:** 2026-06-23 — roteiro em [`kick-off-e2.md`](kick-off-e2.md)

Todos os itens abaixo precisam estar ✓ antes da **Etapa 1** (código).

---

## 1. Termo piloto + opt-in cliente final

| Item | Responsável | Status | Artefato |
|---|---|---|---|
| Termo revisado (jurídico opcional no piloto) | Produto | ⬜ | [`termo-piloto.md`](termo-piloto.md) |
| Termo assinado pela E2 | E2 | ⬜ | cópia assinada (fora do repo) |
| Mensagem opt-in pronta para encaminhar | Produto | ✅ | [`opt-in-cliente-final.md`](opt-in-cliente-final.md) |
| Opt-in enviado aos clientes piloto | E2 | ⬜ | registrar data por cliente em [`selecao-clientes-e2.md`](selecao-clientes-e2.md) |

---

## 2. Eval set

| Item | Responsável | Status | Artefato |
|---|---|---|---|
| Protocolo de coleta e anonimização | Produto | ✅ | [`coleta-eval-set.md`](coleta-eval-set.md) |
| ≥ 30 extratos anonimizados | E2 → Produto | ⬜ | `docs/knowledge/eval-set/` (gitignored) |
| ≥ 5 bancos distintos | — | ⬜ | registrar em [`coleta-eval-set.md`](coleta-eval-set.md) |
| Mix PDF + OFX | — | ⬜ | |
| ≥ 3 edge cases (senha, escaneado, multi-conta) | — | ⬜ | |
| Revisão manual pós-anonimização | Produto | ⬜ | |

Critérios de acerto: [`criterios-eval-conversao.md`](criterios-eval-conversao.md)

---

## 3. Import Alterdata validado

| Item | Responsável | Status | Artefato |
|---|---|---|---|
| Versão Alterdata confirmada | E2 | ⬜ | [`validacao-alterdata.md`](validacao-alterdata.md) |
| 1 export manual importa OK no Alterdata E2 | E2 | ⬜ | `sample-import.csv` (local, gitignored) |
| Mapeamento campo a campo documentado | Produto + E2 | ⬜ | [`../knowledge/layouts-importacao/alterdata/field-mapping.md`](../knowledge/layouts-importacao/alterdata/field-mapping.md) |

---

## 4. Templates Meta submetidos

| Item | Responsável | Status | Artefato |
|---|---|---|---|
| Conta Meta Business + WABA configurada | Produto | ⬜ | |
| Templates utility redigidos | Produto | ✅ | [`templates-meta-whatsapp.md`](templates-meta-whatsapp.md) |
| Templates submetidos para review Meta | Produto | ⬜ | registrar IDs em [`templates-meta-whatsapp.md`](templates-meta-whatsapp.md) |
| Template aprovado (cobrança) | Meta | ⬜ | aprovação leva dias — submeter cedo |

---

## 5. Baseline semana 0 (E2)

| Item | Responsável | Status | Artefato |
|---|---|---|---|
| Seleção 5–10 clientes | E2 | ⬜ | [`selecao-clientes-e2.md`](selecao-clientes-e2.md) ou **import CSV** [`import-clientes.md`](import-clientes.md) |
| Tempos registrados (competência anterior = jun/2026) | E2 | ⬜ | [`baseline-semana-0.md`](baseline-semana-0.md) |

---

## 6. Calendário competência

| Item | Responsável | Status | Artefato |
|---|---|---|---|
| Datas acordadas com E2 | Produto + E2 | 🟡 | [`calendario-competencia-piloto.md`](calendario-competencia-piloto.md) — proposta preenchida; confirmar deadline dia 10 no kick-off |

---

## Semáforo

| | |
|---|---|
| ⬜ Pendente | 🟡 Parcial / proposta |
| ✅ Pronto (lado produto) | ✓ Concluído (E2 + produto) |

**Pronto para codar quando:** todas as linhas de status = ✓.

## Próxima ação imediata

1. **2026-06-23** — call kick-off E2 ([`kick-off-e2.md`](kick-off-e2.md))
2. E2 envia até **2026-06-30**: lista clientes, baseline jun/2026, 1 sample Alterdata, lote inicial de extratos para eval
3. Produto submete templates Meta e prepara termo para assinatura
