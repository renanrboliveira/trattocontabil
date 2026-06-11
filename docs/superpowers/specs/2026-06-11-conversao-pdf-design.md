# Conversão PDF (Etapa 2b) — design

Data: 2026-06-11
Status: aprovado pelo Renan

## Contexto

Hoje o pipeline aceita PDF mas o deixa em `triagem` sem conversão ("conversão automática na Etapa 2b"). PDF é o formato que o cliente final leigo realmente manda. Meta do plano piloto: **≥ 95% de acerto sem triagem** no eval set (`docs/piloto/criterios-eval-conversao.md`), com kill criteria < 85% após 2 ciclos de calibração.

Decisões de brainstorm aprovadas:
- Construir agora e calibrar com **eval sintético** (5-8 PDFs de bancos diferentes com gabarito); eval real com a E2 valida antes de produção.
- Execução **assíncrona via fila + Vercel Cron** (webhook Meta não pode bloquear).
- Triagem **revisar + aprovar** (sem edição inline).
- **Cascata de modelos** + telemetria de custo (unit economics: tabela R$399/mês p/ 150 CNPJs; custo de conversão alvo ≤ 15% da receita por CNPJ).
- Dependência nova aprovada: `@anthropic-ai/sdk` em `web/`.

## Arquitetura da conversão

### Extração (`web/src/lib/pdf/extract.ts`)

Uma chamada à API da Anthropic por tentativa, com o PDF inteiro:

- Document block base64 (`{type: "document", source: {type: "base64", media_type: "application/pdf", data}}`) + instrução de extração.
- **Structured output** via `output_config.format` (`json_schema`, raw — sem zod). Schema:

```json
{
  "banco_nome": "string",
  "banco_codigo_febraban": "string|null",
  "conta_ref": "string|null",
  "competencia": "YYYY-MM|null",
  "saldo_inicial": "number|null",
  "saldo_final": "number|null",
  "escaneado": "boolean",
  "ilegivel": "boolean",
  "transacoes": [{ "data": "YYYY-MM-DD", "valor": "number (positivo)", "tipo": "C|D", "descricao": "string" }]
}
```

- `max_tokens` 16000 com streaming (`client.messages.stream` + `finalMessage()`); thinking adaptativo quando o modelo suportar.
- Retorna também `usage` (tokens in/out) e o modelo usado.

### Cascata de modelos

```
PDF_MODEL_PRIMARY (default: claude-sonnet-4-6)
  → valida (determinístico) → ok? convertido
  → falhou? PDF_MODEL_FALLBACK (default: claude-opus-4-8)
      → valida → ok? convertido
      → falhou? triagem com motivo
```

- Modelos em env vars; trocar calibração sem deploy. Se `PDF_MODEL_FALLBACK` vazio, sem segunda tentativa.
- Justificativa: validação determinística torna a escalada segura; a maioria dos extratos limpos converge no modelo barato (~R$0,32/doc típico) e só os difíceis pagam Opus (~R$0,53-1,70).

### Validação determinística (`web/src/lib/pdf/validate.ts`, módulo puro)

Critérios (espelham `criterios-eval-conversao.md`):
1. `saldo_final − saldo_inicial = Σ(transações assinadas)` com tolerância ± R$ 0,01. Se saldos vierem null → falha ("saldos não identificados").
2. `transacoes.length > 0`.
3. Todas as datas parseáveis; ≥ 80% dentro da competência inferida (extratos cruzam mês na borda).
4. `escaneado` ou `ilegivel` true → falha direta com motivo correspondente.

Retorna `{ ok: true } | { ok: false, motivo: string }`. O motivo vai para `extratos.triagem_motivo`.

### Guardas pré-chamada (sem custo de API)

- **PDF com senha**: scan dos bytes por marcador `/Encrypt` → triagem com motivo "PDF protegido por senha — pedir reenvio sem senha". **Nunca persistir/registrar senha** (regra inviolável).
- Tamanho > 30MB ou > 100 páginas (limites da API) → triagem com motivo.
- `ANTHROPIC_API_KEY` ausente → job falha com erro claro, extrato permanece em triagem.

## Pipeline e fila

- `ingest.ts`: PDF passa a criar `pipeline_job` (status `pending`) em vez de retornar "Etapa 2b". Resposta ao canal: "PDF recebido — conversão em processamento".
- `process.ts`: branch por tipo — OFX mantém o caminho atual (inline, sem regressão); PDF roda extração+cascata+validação.
  - Sucesso → persiste `transacoes` (delete+insert, como OFX), extrato `convertido` com `transacao_count`, saldos e telemetria.
  - Validação falhou → persiste transações da melhor tentativa (para revisão), extrato `triagem` + `triagem_motivo`.
  - Erro de API → `pipeline_jobs.attempts` +1; ≥ 3 tentativas → extrato `erro`.
- **Worker**: `web/src/app/api/worker/process/route.ts` (POST) chama `processPendingJobs(limit 5)`. Protegido por header `Authorization: Bearer ${CRON_SECRET}`.
- **Cron**: `web/vercel.json` com cron a cada minuto chamando o worker. Dev local: botão/script ou chamada manual ao endpoint.

## Schema (migration nova)

`extratos` ganha colunas:
- `saldo_inicial numeric`, `saldo_final numeric`
- `triagem_motivo text`
- `conversao_modelo text`, `conversao_tokens_entrada int`, `conversao_tokens_saida int`, `conversao_tentativas int`
- `aprovado_por uuid null` (auth.users), `aprovado_em timestamptz null`

Sem tabela nova. RLS já cobre `extratos`.

## Triagem UX (detalhe do extrato)

- Banner com `triagem_motivo` quando status = triagem.
- Transações persistidas aparecem na tabela existente (mesmo sem saldo bater), com aviso "conversão não validada — confira antes de aprovar".
- Botão **"Aprovar conversão"** (server action): triagem → convertido, grava `aprovado_por`/`aprovado_em`. Visível só quando há transações persistidas.
- Sem edição inline (decisão de escopo): erro grosseiro → pedir reenvio ou tratar fora.

## Eval

- `scripts/eval-conversao.mjs` (Node, roda local): para cada par `*.pdf` + `*.gabarito.json` em `docs/knowledge/eval-set/` (subpastas `sintetico/` e `anonimizados/`), roda extração+validação e compara com o gabarito pelos critérios oficiais (campo a campo, omissões, duplicatas).
- Saída: tabela Pass / Pass-with-triage / Fail + % acerto + breakdown por banco/modelo + **custo médio por documento** (tokens × preço por modelo).
- Eval sintético inicial: 5-8 PDFs gerados localmente (bancos/layouts distintos, 1 escaneado, 1 multi-conta) com gabaritos. Gerados fora do produto (sem dependência nova); ficam em `docs/knowledge/eval-set/sintetico/` (gitignored).
- Gate de produção: rodar eval real (≥30 extratos E2) antes de ligar conversão para clientes reais.

## LGPD

- Conteúdo de extrato passa a ser enviado à API da Anthropic → Anthropic vira **suboperador**. Atualizar `docs/piloto/protocolo-lgpd-piloto.md` (seção de suboperadores) citando: uso da API sem retenção para treinamento (padrão), dados trafegam para processamento de conversão.
- Manter regras invioláveis: nunca logar conteúdo de extrato; nunca persistir senha de PDF. Logs do worker registram apenas IDs, status, motivo e contagens.

## Custos (referência para calibração, câmbio ~R$5,15)

| Cenário | Sonnet 4.6 | Opus 4.8 |
|---|---|---|
| Extrato típico (2-4 págs, 30-60 tx) | ~R$ 0,32 | ~R$ 0,53 |
| Extrato pesado (10 págs, 150 tx) | ~R$ 1,03 | ~R$ 1,70 |

Receita por CNPJ: R$ 2,66-4,99/mês (tabela §6 do plano). Critério de saúde: custo de conversão ≤ 15% da receita por CNPJ, medido pela telemetria.

## Fora de escopo (etapas futuras)

- Resposta automática ao cliente final ("envie sem senha") via WhatsApp — depende da régua (Etapa 4); por ora o motivo aparece só no painel.
- Edição inline de transações.
- Batches API (lever de custo para reprocessamentos em massa).
- Extração em duas passadas para PDFs > 100 páginas.
- Suporte a foto/print (imagem) — tratar como evolução após eval do PDF.

## Critérios de aceite

1. Upload de PDF legível → vira `pipeline_job`, worker converte (cron ou chamada manual), extrato `convertido` com transações e saldos persistidos, telemetria preenchida.
2. PDF com senha → triagem imediata com motivo correto, sem chamada à API, sem persistir senha.
3. PDF cuja validação falha → triagem com motivo + transações da melhor tentativa visíveis no detalhe + botão "Aprovar conversão" funcional (gera auditoria aprovado_por/em).
4. Cascata: falha no primário dispara fallback (observável pela telemetria `conversao_modelo`/`conversao_tentativas`).
5. `scripts/eval-conversao.mjs` roda contra o eval sintético e imprime acerto + custo/doc; resultado registrado no log de execuções do `criterios-eval-conversao.md`.
6. OFX sem regressão (converte inline como hoje).
7. Nenhum conteúdo de extrato em logs; `protocolo-lgpd-piloto.md` atualizado.
