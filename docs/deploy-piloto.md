# Deploy piloto — Vercel + Supabase Cloud

> Objetivo: ambiente compartilhado para demo E2 antes do kick-off (2026-06-23).

## Pré-requisitos

- Conta Vercel + Supabase (mesmo e-mail ou SSO)
- CLI: `npm i -g vercel` e `npx supabase login`

## 1. Supabase Cloud

```bash
cd /caminho/extrato-pronto

# Criar projeto (nome sugerido: extrato-pronto-piloto)
npx supabase projects create extrato-pronto-piloto --org-id <org-id> --region sa-east-1

# Vincular e enviar schema
npx supabase link --project-ref <project-ref>
npx supabase db push
```

No dashboard Supabase:

1. **Storage** → bucket `extratos` (privado) — a migration inicial cria policies; confirme que existe.
2. **Authentication** → habilitar e-mail/senha.
3. **Settings → API** → copiar URL, anon key e service role key.

### Seed E2 (produção)

Execute no SQL Editor (após `db push`):

```sql
-- Conteúdo de supabase/seed.sql + vínculo de usuário
insert into public.escritorio_membros (escritorio_id, user_id, role)
values (
  'a0000000-0000-4000-8000-000000000001',
  '<uuid do usuário Auth>',
  'admin'
);
```

Crie o usuário do painel em Authentication antes do insert acima.

## 2. Vercel

```bash
cd web
vercel link          # projeto: extrato-pronto
vercel env pull .env.local
```

Configure variáveis em **Production** e **Preview**:

| Variável | Origem |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | idem (server only) |
| `DEFAULT_ESCRITORIO_SLUG` | `e2-piloto` |
| `INBOUND_EMAIL_SECRET` | gerar (`openssl rand -hex 32`) |
| `WORKER_SECRET` | gerar |
| `CRON_SECRET` | gerado automaticamente pelo Vercel Cron |
| `WHATSAPP_VERIFY_TOKEN` | Meta App Dashboard |
| `WHATSAPP_APP_SECRET` | Meta |
| `WHATSAPP_ACCESS_TOKEN` | Meta |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta |
| `PLATFORM_ADMIN_EMAILS` | e-mail do super admin |

Deploy:

```bash
vercel --prod
```

### Cron (fila)

`web/vercel.json` agenda `GET /api/worker/process` a cada 5 min. O handler aceita `Authorization: Bearer $CRON_SECRET` (Vercel) ou header `x-worker-secret`.

## 3. Webhooks em produção

| Canal | URL | Auth |
|-------|-----|------|
| WhatsApp | `https://<dominio>/api/webhooks/whatsapp` | Meta HMAC |
| E-mail inbound | `https://<dominio>/api/webhooks/email` | `x-inbound-secret` |
| Worker manual | `POST /api/worker/process` | `x-worker-secret` |

Meta: configurar callback URL e verify token = `WHATSAPP_VERIFY_TOKEN`.

E-mail: Resend/Postmark inbound → transformar payload para o contrato em `docs/spec-arquitetura.md` §7.2.

## 4. Smoke test pós-deploy

```bash
BASE_URL=https://<dominio> INBOUND_EMAIL_SECRET=<secret> ./scripts/demo-e2.sh
```

Login no painel → import CSV → upload OFX → export CSV.

## 5. Checklist

- [ ] Migrations aplicadas no cloud (`db push`)
- [ ] Usuário E2 vinculado em `escritorio_membros`
- [ ] Env vars Production preenchidas
- [ ] Cron ativo (Vercel → Project → Cron Jobs)
- [ ] `./scripts/demo-e2.sh` passa contra produção
- [ ] Import Alterdata validado com E2 (`field-mapping.md`)
