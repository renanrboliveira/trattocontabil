# Import de clientes — CSV

> Referência: `docs/spec-arquitetura.md` § Cadastro de clientes.
> **Piloto E2:** import único no kick-off (white-glove) + self-service no painel.

## Por que CSV

Escritórios já têm CNPJs, contatos e bancos no Alterdata ou planilha. Cadastrar um a um no painel repete a dor que o produto elimina.

## Template

Download no painel ou use [`web/public/template-import-clientes.csv`](../../web/public/template-import-clientes.csv).

| Coluna | Obrigatório | Exemplo |
|--------|-------------|---------|
| `cnpj` | sim | `12345678000199` |
| `razao_social` | sim | `Empresa Alpha Ltda` |
| `telefone` | recomendado | `5511999990001` (WhatsApp) |
| `email` | recomendado | `alpha@cliente.example.com` |
| `banco_codigo` | por banco | `itau` |
| `banco_nome` | com banco | `Itaú` |
| `conta_ref` | opcional | `cc-001` (default: `principal`) |

**Uma linha = um banco do cliente.** Repita CNPJ/razão social para múltiplos bancos.

Linha só com CNPJ + razão social (sem banco) também é aceita — bancos podem entrar depois via triagem ou novo import.

## Fluxo ImportJob

```
Upload CSV
  → parse + validação (CNPJ 14 dígitos, colunas obrigatórias)
  → preview (opcional) — erros por linha, contagem clientes/bancos
  → confirmar → upsert idempotente
       clientes: unique (escritorio_id, cnpj)
       cliente_bancos: unique (cliente_id, banco_codigo, conta_ref)
  → registro em clientes_import_batches
```

## Upsert (idempotente)

| Entidade | Chave | Comportamento |
|----------|-------|---------------|
| Cliente | `escritorio_id` + `cnpj` | Atualiza razão social, tel, e-mail se reimportar |
| Banco | `cliente_id` + `banco_codigo` + `conta_ref` | Atualiza `banco_nome` |

Reimportar a mesma planilha **não duplica** — só atualiza.

## Kick-off E2 (white-glove)

1. Pedir planilha atual ou export Alterdata (se existir)
2. Ajustar colunas ao template
3. Import no painel ou via SQL seed para os 5–10 clientes piloto
4. Validar matriz cliente × banco no painel

## Perguntas para E2

- De onde vem a lista hoje? (Alterdata / Excel / outro)
- Existe export de empresas no Alterdata?
- Tel/e-mail do responsável por extrato — mesma fonte?

## Futuro (pós-piloto)

- Adapter import direto Alterdata cadastro (simétrico ao export Etapa 2a)
- Cadastro lazy via triagem (complemento, não substituto)
- Checklist mensal separado do cadastro mestre (`checklist_pendencias`)
