# Extrato Pronto — convenções do projeto

## O que é

Produto B2B2C para escritórios contábeis: régua de cobrança, recepção de extratos (WhatsApp + e-mail), conversão PDF/OFX e exportação para sistema contábil (Alterdata no piloto).

Documento fundador: `docs/plano-piloto.md`.

## Regras invioláveis

- **Nunca tocar fiscal** — XML/NF-e, SPED, apuração, reforma tributária como produto. Fora de escopo permanente.
- **LGPD** — escritório = controlador, produto = operador. Ver `docs/piloto/protocolo-lgpd-piloto.md`.
- **Nunca persistir senha de PDF.**
- **Nunca logar conteúdo de extrato em plain text.**
- **Idempotência obrigatória** — deduplicar por hash(arquivo) + competência + CNPJ + banco.

## Stack (piloto — confirmado em `docs/spec-arquitetura.md`)

- **Vercel** — Next.js 16 App Router (`web/`)
- **Supabase** — Postgres + RLS multi-tenant por escritório, Auth, Storage
- **Fila** — tabela `pipeline_jobs`; async via Cron antes da régua (Etapa 4)
- **Meta Cloud API** — WhatsApp (número compartilhado no piloto)
- **E-mail inbound** — webhook genérico (Resend/Postmark depois)
- **OFX** — parser determinístico; **PDF** — Claude visão (Etapa 2b)

## Multi-tenant

- Escritório = tenant
- Número WhatsApp compartilhado no piloto — roteamento por telefone/e-mail cadastrado (ver plano §2.2)
- RLS em todas as tabelas com dados de cliente

## Ritmo

- Qualidade sobre velocidade
- Nenhuma etapa > 2 semanas sem demo para contadora real
- Feedback quinzenal roteirizado (`docs/piloto/roteiro-feedback-quinzenal.md`)

## Comandos úteis

(A criar em `.claude/commands/` — ex.: `/eval-conversao`)
