# Extrato Pronto

Orquestração ponta a ponta do fluxo de extratos bancários para escritórios contábeis de CNPJs pequenos (Simples): cobrança → recepção → conversão → exportação contábil.

**Status:** Etapa **2a** (export Alterdata CSV v1) + P0 fechados · validar import com E2.

## Documentação

| Doc | Descrição |
|---|---|
| [docs/plano-piloto.md](docs/plano-piloto.md) | Plano fundador — escopo, métricas, sequência |
| [docs/piloto/etapa-0-checklist.md](docs/piloto/etapa-0-checklist.md) | Pré-requisitos operacionais (paralelo) |
| [docs/piloto/import-clientes.md](docs/piloto/import-clientes.md) | Import CSV de clientes (kick-off E2) |
| [web/README.md](web/README.md) | **Setup dev + painel Etapa 1** |
| [docs/spec-arquitetura.md](docs/spec-arquitetura.md) | **Spec validada** — stack, pipeline, gaps, roadmap |

## Stack (Etapa 1)

- **Next.js 16** — painel + webhooks + worker HTTP
- **Supabase** — Postgres, RLS multi-tenant, Storage, Auth
- **Parser OFX** determinístico + idempotência `hash + CNPJ + banco + competência`

## Quick start

```bash
npx supabase start
npx supabase db reset
cd web && cp .env.example .env.local
# preencher chaves do supabase start
npm run dev
```

Ver [web/README.md](web/README.md) para criar usuário e vincular ao escritório E2 seed.
