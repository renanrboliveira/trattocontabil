# Régua de cobrança (Etapa 4) — design

Data: 2026-06-11
Status: aprovado pelo Renan

## Contexto

Etapa 4 do plano piloto: "Cron de cobrança agregada + rollover mensal — cliente-teste recebe cobrança; envio dá baixa sozinho". Template UTILITY `cobranca_extrato_pendente` já redigido em `docs/piloto/templates-meta-whatsapp.md` (1 msg/cliente/dia, pendências agregadas, opt-out PARAR). Calendário: régua liga dia 01 do mês seguinte à competência; deadline interno dia 10; meta >70% de resposta com ≤3 lembretes.

Decisões de brainstorm aprovadas:
- **Meta inexistente ainda** (sem WABA/número/templates) → régua nasce em **dry-run** (`REGUA_MODE`); ligar = trocar env var. Item externo do Renan: criar Meta Business/WABA e submeter os 2 templates (gargalo do calendário de 01/ago).
- **Caminho de teste em 3 níveis (sem CNPJ até o nível 2):** (1) dry-run, sem Meta; (2) número de teste do app de developers.facebook.com — WABA/número gratuitos sem verificação de empresa, envio para até 5 destinatários pré-verificados, valida `REGUA_MODE=live` ponta a ponta trocando só env vars; (3) número real sem verificação completa — limite reduzido (~250 conversas/dia, display name pendente; confirmar no console), suficiente para o piloto de 5-10 clientes. Verificação por CNPJ destrava escala e nome verificado.
- Escopo: **só cobrança + PARAR**. Confirmação de recebimento (template 2, SIM/NÃO) fica para etapa futura.
- Arquitetura: **derivação on-the-fly no cron** (reuso da lógica de pendências do painel) + log de cobranças como outbox simples. Checklist materializado (`checklist_pendencias`) anotado para escala, não agora.

## Regras de negócio

### Competência cobrada e janela

- A régua cobra sempre a competência **anterior ao mês corrente** (ex.: em agosto, cobra jul/2026).
- Janela: do dia 01 ao dia 10 do mês corrente (deadline interno do plano).
- Lembretes: nos dias **1, 4 e 8** do mês (máx 3 por cliente por competência). Dias fixos no piloto; configurável por escritório fica para depois (YAGNI).
- Cron diário às **12:00 UTC** (9h America/Sao_Paulo) — garante 1 msg/cliente/dia por construção.

### Elegibilidade do cliente

Recebe cobrança o cliente que, na rodada:
1. Tem ≥ 1 pendência com status `falta` na competência cobrada (derivação on-the-fly — mesma semântica de `derivePendencias` do painel: pares cliente×banco sem extrato);
2. Tem `telefone` cadastrado (campo existente em `clientes`, já usado pelo roteamento);
3. `regua_opt_in = true` e `regua_opt_out_em is null`;
4. Não recebeu cobrança desta competência hoje e tem `tentativa < 3`.

Baixa automática: não há estado de "baixa" — extrato recebido remove o banco da derivação; cliente sem pendências simplesmente sai da régua. É o critério "envio dá baixa sozinho".

### Mensagem

Template 1 `cobranca_extrato_pendente` (pt_BR, UTILITY) com as variáveis do doc:
`{{1}}` nome do contato (novo campo `clientes.contato_nome`, fallback razão social) · `{{2}}` nome do escritório · `{{3}}` competência ("jul/2026") · `{{4}}` lista agregada ("Itaú · Bradesco") · `{{5}}` e-mail de recepção (`escritorios.email_inbound`).

## Componentes

### Adapter de envio — `web/src/lib/whatsapp/send.ts`

```
sendTemplate({ to, templateName, languageCode, variables }) → { ok, wamid? , error? }
sendSessionText({ to, text }) → idem   // resposta de opt-out (janela 24h)
```

- `REGUA_MODE=dry_run` (default): não chama a Meta; retorna ok com `wamid: null`.
- `REGUA_MODE=live`: POST Graph API `/{phone_number_id}/messages` com `WHATSAPP_ACCESS_TOKEN` (já existente) + `WHATSAPP_PHONE_NUMBER_ID` (env nova).
- Nunca logar o corpo da mensagem; logs só com IDs/status.

### Motor da régua — `web/src/lib/regua/run.ts` (puro onde possível)

- `selecionarCobrancas(escritorio, hoje)`: deriva pendências da competência cobrada, agrupa por cliente, aplica elegibilidade, monta payload do template. Funções de data/elegibilidade puras e separadas (testáveis sem IO).
- `runRegua(admin, hoje)`: para cada escritório, seleciona, insere linhas em `cobrancas` (status `pendente`), envia via adapter, atualiza para `enviada` | `dry_run` | `falha` (com erro). Reprocesso de `falha` na rodada seguinte conta como mesma tentativa.

### Worker — `web/src/app/api/worker/regua/route.ts`

POST protegido por `Authorization: Bearer ${CRON_SECRET}`. Chama `runRegua`. Também garante o rollover: `ensureCompetencia(escritorio, mês corrente)` para todos os escritórios (dia 1 cria a competência nova).

### Cron — `web/vercel.json`

```json
{ "crons": [{ "path": "/api/worker/regua", "schedule": "0 12 * * *" }] }
```

(Se o arquivo já existir com o cron da 2b criado pelo Cursor, **mesclar** — não sobrescrever.)

### Opt-out PARAR — webhook WhatsApp existente

Em `web/src/app/api/webhooks/whatsapp/route.ts`: mensagem `type: "text"` cujo corpo normalizado (trim/lower/sem acento) seja `parar` →
1. Resolve cliente por telefone (`matchClienteByRemetente`);
2. Seta `clientes.regua_opt_out_em = now()`;
3. Responde confirmação via `sendSessionText` ("Lembretes automáticos desativados. Para reativar, fale com seu contador.") — em dry_run só registra.
Remetente desconhecido com "parar": ignora (sem resposta).

### Painel

- Na tabela de pendências, a célula "Cobrar via WhatsApp (em breve)" passa a mostrar o estado real da cobrança do cliente na competência: "Cobrado 2× · última 05/08" (de `cobrancas`), badge "opt-out" quando aplicável.
- Botão **"Cobrar agora"** (server action): dispara cobrança individual fora da cadência (respeita opt-out/telefone; conta como tentativa; funciona em dry-run). Visível para pendências `falta`.

## Schema (migration nova)

`clientes`:
- `contato_nome text null`
- `regua_opt_in boolean not null default false`
- `regua_opt_out_em timestamptz null`

Nova tabela `cobrancas` (RLS por escritório, como as demais):
- `id uuid pk`, `escritorio_id`, `cliente_id`, `competencia_id`
- `tentativa int not null` (1-3)
- `pendencias jsonb not null` (snapshot: `[{banco_codigo, banco_nome}]`)
- `mensagem text not null` (corpo renderizado — contém só nome/escritório/bancos, sem conteúdo de extrato)
- `status text not null` (`pendente | enviada | dry_run | falha`)
- `canal text not null default 'whatsapp'`
- `wamid text null`, `erro text null`
- `created_at`, `sent_at`
- Índice `(escritorio_id, cliente_id, competencia_id)`.

Opt-in: definido no import de clientes (coluna nova opcional no CSV) ou manualmente via SQL no piloto; coleta formal segue `docs/piloto/opt-in-cliente-final.md`.

## Env vars

| Var | Uso |
|---|---|
| `REGUA_MODE` | `dry_run` (default) \| `live` |
| `WHATSAPP_PHONE_NUMBER_ID` | live only |
| `WHATSAPP_ACCESS_TOKEN` | já existe (download de mídia) |
| `CRON_SECRET` | já previsto pelo worker 2b — reusar |

## Métricas (registrar, não exibir ainda)

`cobrancas` + `extratos.created_at` permitem calcular: taxa de resposta ≤3 lembretes por canal, tempo cobrança→recebimento. Dashboard fica fora desta etapa.

## LGPD

- Mensagem contém: nome do contato, nome do escritório, competência, nomes de bancos, e-mail de recepção. Sem valores, sem CNPJ, sem conteúdo de extrato.
- Opt-out registrado com timestamp (auditável). Template inclui a instrução PARAR (exigência de boas práticas Meta + LGPD).

## Fora de escopo

- Template 2 (confirmação SIM/NÃO) e qualquer fluxo de resposta interativa além de PARAR.
- Cadência configurável por escritório; envio por e-mail (régua é WhatsApp; e-mail é só recepção).
- Dashboard de métricas da régua.
- Número por escritório / Embedded Signup (pós-piloto).

## Coordenação com o trabalho em andamento (Cursor / 2b)

- `vercel.json`, `CRON_SECRET` e o padrão de worker são compartilhados com a 2b — mesclar, não duplicar.
- O webhook WhatsApp será tocado pelos dois trabalhos (2b muda fluxo de PDF; régua adiciona PARAR) — implementar régua **depois** que o Cursor commitar, em branch própria, rebaseando sobre o estado real.

## Critérios de aceite

1. Com `REGUA_MODE=dry_run` e um cliente-teste com pendência `falta` e opt-in: rodada do worker gera linha em `cobrancas` com mensagem renderizada correta (5 variáveis), status `dry_run`, tentativa 1.
2. Cadência respeitada: rodadas nos dias 1/4/8 geram no máximo 3 tentativas; dias fora da janela não geram nada; cliente que enviou o extrato entre rodadas não é cobrado de novo (baixa automática).
3. PARAR via webhook: seta opt-out, cliente sai da régua, painel mostra badge; remetente desconhecido é ignorado.
4. "Cobrar agora" no painel dispara cobrança individual e registra em `cobrancas`.
5. Rollover: no dia 1 o worker garante a competência do mês corrente para todos os escritórios.
6. Com `REGUA_MODE=live` (quando WABA existir): envio real retorna `wamid` e status `enviada` — validável com o cliente-teste do critério da Etapa 4.
7. Nenhum conteúdo de extrato em `cobrancas` nem em logs.
