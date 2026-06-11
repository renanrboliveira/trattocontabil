# Alterdata — mapeamento de importação

> **Status:** aguardando sample real da E2. Objetivo da Etapa 0: 1 arquivo gerado manualmente importa OK no Alterdata.

## Informações a coletar com E2

- [ ] Versão do Alterdata (Desktop / Web / Contábil Fácil)
- [ ] Menu exato: Importação → qual layout/formato
- [ ] Arquivo `.csv` / `.txt` / `.xml` que importou com sucesso (salvar como `sample-import.csv` — **gitignored**)
- [ ] Campos obrigatórios vs opcionais
- [ ] Formato de data (DD/MM/AAAA vs AAAA-MM-DD)
- [ ] Separador decimal (vírgula vs ponto)
- [ ] Encoding (UTF-8 vs Latin-1)
- [ ] Como tratar saldo inicial/final (linha separada vs implícito)

> **Status:** layout provisório **v1** (`alterdata_csv_v1`) — validar import com E2 na Etapa 0.
> Gerador: `web/src/lib/export/alterdata-csv.ts`

## Layout CSV v1 (provisório)

Separador `;` · decimal `,` · encoding UTF-8 com BOM · datas `DD/MM/AAAA`

```csv
Data;Histórico;Valor;Tipo
01/07/2026;PIX ENVIADO;150,00;D
10/07/2026;TED RECEBIDA;2500,00;C
```

| Campo Alterdata | Origem | Transformação |
|---|---|---|
| Data | `transacoes.data` | `DD/MM/AAAA` |
| Histórico | `transacoes.descricao` | truncar 200 chars; `;` → `,` |
| Valor | `transacoes.valor` | absoluto, `9999,99` |
| Tipo | `transacoes.tipo` | `C` ou `D` |

**Ajustar** após sample real da E2 importar OK.

## Validação

| Data | Arquivo | Importou? | Erros | Notas |
|---|---|---|---|---|
| | | | | |

## Referências

- Sample (local, não commitado): `sample-import.csv`
- Plano: `docs/plano-piloto.md` §4.0, §4.2 etapa 2a
