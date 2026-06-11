# Templates Meta — WhatsApp (utility)

> Referência: `docs/plano-piloto.md` §4.0 · submeter **na Etapa 0** (aprovação leva dias).
> Categoria: **UTILITY** · 1 msg/cliente/dia na régua (pendências agregadas).

Preencher após criar conta Meta Business / WABA.

## Conta

| Campo | Valor |
|---|---|
| Meta Business ID | |
| WABA ID | |
| Número piloto (Cloud API) | |
| Data submissão | |

---

## Template 1 — `cobranca_extrato_pendente` (régua)

**Categoria:** UTILITY  
**Idioma:** pt_BR

**Corpo:**

```
Olá {{1}}, aqui é do {{2}}.

Pendências de extrato bancário ({{3}}):
{{4}}

Envie PDF ou OFX por este WhatsApp ou para {{5}}.

Responda PARAR para não receber lembretes automáticos.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | Nome contato | Maria |
| `{{2}}` | Nome escritório | Contábil XYZ |
| `{{3}}` | Competência | jul/2026 |
| `{{4}}` | Lista agregada | Itaú CC · Bradesco PJ |
| `{{5}}` | E-mail recepção | extratos@escritorio.com |

**Botões (opcional):** nenhum — resposta livre com anexo.

---

## Template 2 — `confirmacao_extrato_recebido`

**Categoria:** UTILITY

**Corpo:**

```
Recebemos extrato {{1}} — {{2}} de {{3}} ({{4}}).

Está correto? Responda SIM ou NÃO.
```

| Variável | Conteúdo | Exemplo |
|---|---|---|
| `{{1}}` | Banco | Itaú |
| `{{2}}` | Tipo conta | Conta corrente |
| `{{3}}` | Nome empresa | Empresa X |
| `{{4}}` | Competência | jul/2026 |

---

## Template 3 — `extrato_recebido_ok` (pós-confirmação)

**Categoria:** UTILITY

**Corpo:**

```
Extrato {{1}} de {{2}} registrado. Obrigado!
```

---

## Status de submissão

| Nome template | Meta template ID | Submetido em | Status | Aprovado em |
|---|---|---|---|---|
| cobranca_extrato_pendente | | | ⬜ draft | |
| confirmacao_extrato_recebido | | | ⬜ draft | |
| extrato_recebido_ok | | | ⬜ draft | |

## Notas Meta

- Utility exige conteúdo transacional — evitar tom promocional
- Opt-out **PARAR** deve ser respeitado no backend (Etapa 4)
- Manter cópia alinhada com [`opt-in-cliente-final.md`](opt-in-cliente-final.md)
