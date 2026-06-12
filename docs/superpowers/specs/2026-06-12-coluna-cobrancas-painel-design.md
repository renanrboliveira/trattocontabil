# Coluna "Cobranças" no painel — design

Data: 2026-06-12
Status: aprovado (opção C do brainstorm visual)

## Problema

Na tabela de pendências do painel, o resumo "Cobrado N× · última DD/MM" é renderizado
dentro da coluna Ação, antes do botão "Cobrar agora". Linhas com resumo empurram o botão
para a direita; linhas sem resumo não. Resultado: botões desalinhados entre linhas.

Problema secundário: cobranças com status `falha` são invisíveis na UI. O filtro em
`buildCobrancaMap` só conta `enviada` e `dry_run`, e o `CobrarAgoraButton` descarta o
retorno da action — clique que falha não dá feedback nenhum.

## Decisão

Opção C do brainstorm: coluna própria "Cobranças" entre Status e Ação. Escolhida sobre
"botão primeiro, texto depois" (A) e "texto embaixo do botão" (B) porque resolve o
alinhamento em grade de vez e cria lugar natural para o indicador de falha.

## Mudanças

Tudo em `web/src/app/painel/page.tsx` (server component, sem mudança de dados — a query
de `cobrancas` já busca todos os status).

### 1. Nova coluna "Cobranças"

Entre Status e Ação, presente em todas as linhas da tabela de pendências. Conteúdo, em
ordem de precedência:

- Cliente com opt-out: badge `opt-out` (mesmo estilo atual, movido da coluna Ação).
- Resumo `Cobrado N× · última DD/MM` contando `enviada`/`dry_run` (lógica atual de
  `formatCobrancaResumo`).
- Se a tentativa mais recente do cliente (qualquer status, por `sent_at ?? created_at`)
  for `falha`: badge vermelho discreto `falha DD/MM`, ao lado do resumo ou sozinho se
  nunca houve sucesso.
- Nada disso: `—` em texto muted.

Linhas que não são `falta` (triagem/recebido) mostram `—`.

### 2. Coluna Ação só com a ação

- Linhas `falta`: apenas o botão "Cobrar agora" (quando há competência selecionada).
- Demais linhas: link "Identificar →" / "Ver detalhe →" (inalterado).

### 3. `buildCobrancaMap` rastreia última falha

`CobrancaResumo` ganha `ultimaFalha: string | null` — timestamp da cobrança mais recente
do cliente quando essa cobrança tem status `falha`; `null` caso contrário. O loop passa a
percorrer todos os status: `enviada`/`dry_run` alimentam `tentativas`/`ultima` como hoje;
em paralelo rastreia a cobrança mais recente de qualquer status para decidir `ultimaFalha`.
Status `pendente` não conta nem como sucesso nem como falha.

## Efeito colateral desejado

`cobrarAgoraAction` já chama `revalidatePath("/painel")`. Com o badge de falha, um clique
em "Cobrar agora" que falha passa a refletir na coluna imediatamente — o clique deixa de
ser silencioso.

## Fora de escopo

- Toast/erro inline no `CobrarAgoraButton` (feedback imediato no clique).
- Qualquer mudança em schema, query ou na régua.

## Teste

- Unit dos helpers (`buildCobrancaMap`, `formatCobrancaResumo`) cobrindo: sem cobrança,
  só sucesso, sucesso + falha mais recente, só falha, `pendente` ignorado, opt-out.
- Verificação visual no painel com os três estados (sem cobrança, cobrado, falha).
