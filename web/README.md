# Extrato Pronto — app web (Etapa 1)

Next.js + Supabase. Painel mínimo para validação com E2.

## Setup local

### 1. Supabase

```bash
# na raiz do repo
npx supabase start
npx supabase db reset   # migrations + seed E2
```

Copie as chaves exibidas para `web/.env.local` (use `.env.example` como base).

### 2. Usuário do painel

1. Abra Supabase Studio → Authentication → Create user (e-mail + senha)
2. Copie o `user_id` e vincule ao escritório piloto:

```sql
insert into public.escritorio_membros (escritorio_id, user_id, role)
values (
  'a0000000-0000-4000-8000-000000000001',
  '<user_id do auth>',
  'admin'
);
```

### 3. App

```bash
cd web
npm install
npm run dev
```

Acesse http://localhost:3000 → login → painel.

## Super admin (`/admin`)

Usuários listados em `PLATFORM_ADMIN_EMAILS` (`.env.local`) podem:

- Criar escritórios (nome, slug, e-mail inbound)
- Vincular usuários por e-mail (cria no Auth se não existir)
- Remover vínculos em `escritorio_membros`

Sem vínculo a escritório, super admin cai em `/admin` após login.

## Testar import de clientes

1. Baixar `public/template-import-clientes.csv`
2. Painel → **Importar clientes** → validar preview → confirmar
3. Ver matriz cliente × banco atualizada

## Testar export Alterdata (Etapa 2a)

1. Upload e converta um OFX (cliente Alpha / Itaú — BANKID 341 mapeia para `itau`)
2. Abra o extrato → **Exportar Alterdata (CSV)**
3. Importe o CSV no Alterdata da E2 — ajustar layout em `docs/knowledge/layouts-importacao/alterdata/field-mapping.md` se falhar

Doc: [`docs/piloto/import-clientes.md`](../docs/piloto/import-clientes.md)

## Testar pipeline OFX

```bash
# na raiz do repo — valida ingest + idempotência
./scripts/demo-e2.sh
```

Ou manualmente:

1. No painel, upload de `fixtures/sample.ofx` para cliente Alpha / Itaú
2. Reenvie o mesmo arquivo → status `duplicado` (idempotência)
3. Webhook e-mail (dev):

```bash
curl -X POST http://localhost:3000/api/webhooks/email \
  -H "Content-Type: application/json" \
  -H "x-inbound-secret: dev-email-secret" \
  -d '{
    "from": "alpha@cliente.example.com",
    "attachments": [{
      "filename": "sample.ofx",
      "content_base64": "'$(base64 -i fixtures/sample.ofx | tr -d '\n')'"
    }]
  }'
```

## Endpoints

| Rota | Uso |
|---|---|
| `GET/POST /api/webhooks/whatsapp` | Meta Cloud API |
| `POST /api/webhooks/email` | Inbound e-mail (header `x-inbound-secret`) |
| `POST /api/worker/process` | Reprocessar fila (header `x-worker-secret`) |

## Etapa 1 — critério de pronto

- [ ] OFX via upload ou webhook aparece no painel
- [ ] Transações convertidas e visíveis
- [ ] Reenvio duplicado ignorado (idempotência)
- [ ] RLS: escritório A não vê dados de B

## Deploy (piloto cloud)

Ver [`docs/deploy-piloto.md`](../docs/deploy-piloto.md) — Vercel + Supabase Cloud + cron da fila.
