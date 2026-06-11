# Validação — import Alterdata (Etapa 0)

> Objetivo: **1 arquivo gerado manualmente importa OK** no Alterdata da E2, antes de codar export automático.
> Sample local (gitignored): `docs/knowledge/layouts-importacao/alterdata/sample-import.csv`
> Mapeamento: [`../knowledge/layouts-importacao/alterdata/field-mapping.md`](../knowledge/layouts-importacao/alterdata/field-mapping.md)

## Informações da E2

| Campo | Valor |
|---|---|
| Versão Alterdata | |
| Produto (Desktop / Web / Contábil Fácil) | |
| Menu importação | Importação → |
| Formato aceito | CSV / TXT / XML / outro |
| Encoding | UTF-8 / Latin-1 |
| Separador decimal | vírgula / ponto |
| Formato data | DD/MM/AAAA / AAAA-MM-DD |
| Conta contábil no import | fixa / por coluna / N/A piloto |

## Procedimento

1. E2 exporta ou monta **1 mês real** de 1 cliente piloto no formato que já usa hoje (ou formato padrão Alterdata)
2. Importa no Alterdata — anotar erros linha a linha se falhar
3. Se OK: salvar cópia como `sample-import.csv` (local)
4. Produto documenta mapeamento em `field-mapping.md`

## Registro de tentativas

| Data | Arquivo | Gerado por | Importou? | Erros | Ajuste |
|---|---|---|---|---|---|
| | | E2 / Produto | sim / não | | |

## Critério de pronto

- [ ] Import OK sem retrabalho manual pós-import
- [ ] Campos obrigatórios documentados
- [ ] `field-mapping.md` preenchido com exemplos reais (valores fictícios se necessário)
