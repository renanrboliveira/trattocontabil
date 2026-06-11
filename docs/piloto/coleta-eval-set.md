# Coleta — eval set de conversão

> Referência: [`criterios-eval-conversao.md`](criterios-eval-conversao.md) · alvo **≥ 95%** acerto sem triagem.
> Armazenamento local: `docs/knowledge/eval-set/` (**gitignored** — nunca commitar PII).

## Meta mínima (Etapa 0)

| Critério | Alvo | Atual |
|---|---|---|
| Total extratos | ≥ 30 | |
| Bancos distintos | ≥ 5 | |
| Formato PDF | sim | |
| Formato OFX | sim | |
| Edge: PDF com senha | ≥ 1 | |
| Edge: escaneado | ≥ 1 | |
| Edge: multi-conta | ≥ 1 | |

## Como a E2 envia

1. Extratos de competências **passadas** (jun/2026 ou anteriores) — PDF e/ou OFX
2. Canal acordado no kick-off: e-mail criptografado, drive compartilhado ou outro acordado
3. **Não** enviar pelo repo git

## Estrutura de pastas (local)

```
docs/knowledge/eval-set/
  raw/              # recebidos da E2 (acesso restrito, deletar após anonimizar)
  anonimizados/     # prontos para pipeline de eval
  manifest.csv      # índice: id, banco, formato, competência, edge_case, erros_esperados
```

## Protocolo de anonimização

Antes de mover para `anonimizados/`:

1. Remover CNPJ, razão social, nomes de titulares
2. Substituir número de conta por ID interno (ex.: `conta-001`)
3. Manter layout, estrutura de transações e valores relativos
4. **Revisão manual** produto antes de incluir no set

Detalhes LGPD: [`protocolo-lgpd-piloto.md`](protocolo-lgpd-piloto.md)

## manifest.csv (colunas sugeridas)

```csv
id,banco,formato,competencia,edge_case,fonte_e2,anonimizado_em,revisor,notas
eval-001,itau,pdf,2026-05,,E2,2026-06-25,,
```

## Cronograma sugerido

| Lote | Prazo | Qtd | Objetivo |
|---|---|---|---|
| Lote 1 | 2026-06-30 | ≥ 10 | Validar pipeline OFX + primeiros PDFs |
| Lote 2 | 2026-07-15 | +10 | Cobrir bancos faltantes |
| Lote 3 | 2026-07-31 | até 30+ | Edge cases + mix final |

## Log de recebimento

| Data | Qtd recebidos | Bancos | Anonimizados | No manifest |
|---|---|---|---|---|
| | | | | |
