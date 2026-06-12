# Estratégia de testes — fase 1 (núcleo crítico)

**Data:** 2026-06-12
**Status:** aprovado

## Objetivo

Proteger a lógica que quebra dinheiro/confiança no piloto: idempotência, parser OFX, validação da conversão PDF, export Alterdata, datas/mensagens da régua, import de clientes e verificação de assinatura do webhook WhatsApp.

## Escopo

**Dentro:** somente lógica pura — sem rede, sem banco, sem mock de Supabase.

**Fora (fase futura):** `pipeline/ingest`, `pipeline/process`, `regua/run`, rotas de webhook/worker de ponta a ponta, RLS, chamadas a Supabase/Meta/Anthropic.

## Decisões

| Decisão | Escolha |
|---|---|
| Runner | Vitest (única devDependency nova em `web/`) |
| Localização | Colocados junto ao código: `src/lib/ofx/parse.test.ts` |
| Estilo | Casos explícitos com asserts diretos + fixtures reais sintéticas |
| Fixtures | `web/fixtures/` (já existe `sample.ofx`) |
| Supabase | Não testado nesta fase; integração fica para etapa futura |
| CI | GitHub Actions em push para `main` e PR |
| Cobertura | Sem threshold — meta é proteger o núcleo, não perseguir número |

## Tooling

- Scripts no `web/package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`
- Alias `@/` resolvido na config do Vitest (código usa `@/lib/...`)

## Refactor incluído

`verifyMetaSignature` é função privada em `app/api/webhooks/whatsapp/route.ts` e é lógica de segurança crítica (fail-closed). Extrair para `src/lib/whatsapp/verify-signature.ts` e importar na rota. Nenhuma mudança de comportamento.

## O que testar, por módulo (ordem de risco)

### 1. `pipeline/idempotency.ts` — regra inviolável do projeto
- `hashFile`: hash estável para mesmo conteúdo, diferente para conteúdo diferente
- `buildIdempotencyKey` / `buildTriagemIdempotencyKey`: formato e distinção entre chave plena e de triagem
- `idempotencyScope`: precedência remetente > clienteId > canal; remoção de espaços
- `normalizePhone` / `normalizeEmail`: formatos BR com máscara, +55, espaços, maiúsculas
- `competenciaFromDate` / `parseCompetencia`: ida e volta, mês com zero à esquerda

### 2. `ofx/parse.ts` — parser determinístico
- Fixture multi-transação: banco, conta, datas, valores, tipo C/D por sinal, FITID
- Transação única (OFX vira objeto, não array — razão de existir do `toArray`)
- OFX sem `STMTRS` lança erro; OFX estilo SGML via `stripOfxHeaders`/`normalizeOfxTag`
- `parseOfxDate`: data com timezone (`20260131120000[-3:BRT]`), data curta cai no fallback
- `inferCompetencia`: via dtEnd, via última transação, fallback mês atual
- `isOfxFile` / `isPdfFile`: extensões e MIMEs

### 3. `pdf/validate.ts` — gate de qualidade da conversão por visão
- Rejeições: escaneado, ilegível, zero transações, data inválida (inclui `2026-02-30`), valor <= 0, tipo inválido
- Regra dos 80% na competência inferida (caso exatamente no limite)
- Fechamento de saldo: dentro e fora da tolerância de R$ 0,01
- Inferência de competência por moda dos meses

### 4. `export/alterdata-csv.ts` — o que entra no sistema da contadora
- Data DD/MM/YYYY, decimal com vírgula, `;` no histórico vira `,`, truncamento em 200 chars, BOM + CRLF
- `alterdataExportFilename`: com e sem CNPJ/banco/competência

### 5. `regua/dates.ts` + `regua/template.ts` — quando e o que o cliente recebe
- `competenciaCobrada`: virada de ano (janeiro cobra dezembro do ano anterior)
- `dentroJanelaRegua` / `isDiaLembrete`: dias 1, 4, 8, 10, 11 (bordas, em UTC)
- `normalizeOptOutText`: "PARAR", " parar ", "PÁRAR" com acento
- `renderCobrancaMensagem`: variáveis na ordem do template Meta, fallback "seu contador" sem e-mail, lista de bancos com separador

### 6. `import/clientes-csv.ts` — porta de entrada de dados do escritório
- `normalizeCnpj`: com máscara, sem máscara, inválido
- `previewClientesCsv`: CSV válido, coluna faltando, linha inválida, duplicatas
- `groupRowsByCnpj`: múltiplos bancos por cliente

### 7. `whatsapp/verify-signature.ts` (extraído) — segurança do webhook
- Assinatura válida passa; inválida, ausente, tamanho errado e secret ausente falham (fail-closed)

### 8. Miúdos
- `competencias.ts`: `compLabel`, `compParam`, `parseCompParam`
- `pdf/guards.ts`: magic bytes de PDF, PDF criptografado
- `pdf/eval-compare.ts`: `classifyEvalResult`, `estimateCostBrl`

## Fixtures novas em `web/fixtures/`

- OFX multi-transação, OFX de transação única, OFX sem `STMTRS`, OFX estilo SGML
- CSV de clientes válido e inválido
- Todas sintéticas — nenhum dado real de cliente (LGPD). Cada fixture com uma linha de comentário sobre o que exercita.

## CI — `.github/workflows/ci.yml`

Dispara em push para `main` e em PR:
1. Checkout + Node 21 + cache npm
2. `npm ci` em `web/`
3. `npm run lint`
4. `npm test` (`vitest run`)

Sem build do Next no CI (o deploy da Vercel já valida build).

## Manutenção

- Testes dependentes de data usam data fixa injetada — as funções da régua já recebem `Date` como parâmetro, sem mock de relógio.

## Critérios de pronto

- `npm test` verde local e no CI
- Todos os módulos da lista acima com testes passando
- `verifyMetaSignature` extraído sem mudança de comportamento (webhook continua funcionando)
- Nenhuma fixture com dado real de cliente
