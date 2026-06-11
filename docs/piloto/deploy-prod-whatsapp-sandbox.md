# Deploy produção + WhatsApp Cloud API (sandbox)

Runbook para colocar o piloto no ar (Vercel + Supabase Cloud) e conectar o **WhatsApp test number** da Meta (até 5 destinatários verificados, sem CNPJ).

---

## 0. Gerar secrets (local)

```bash
openssl rand -hex 32   # INBOUND_EMAIL_SECRET
openssl rand -hex 32   # WORKER_SECRET
openssl rand -hex 24   # WHATSAPP_VERIFY_TOKEN (qualquer string forte; anote)
```

Guarde os três valores — entram no Vercel **e** (verify token) na Meta.

---

## 1. Supabase Cloud

```bash
cd /caminho/extrato-pronto
npx supabase login
npx supabase projects create extrato-pronto-piloto --org-id <org-id> --region sa-east-1
npx supabase link --project-ref <project-ref>
npx supabase db push
```

No dashboard:

1. **Authentication** → Email habilitado → criar usuário do painel (E2).
2. **SQL Editor** → rodar `supabase/seed.sql` (escritório + clientes Alpha/Beta).
3. Vincular usuário:

```sql
insert into public.escritorio_membros (escritorio_id, user_id, role)
values (
  'a0000000-0000-4000-8000-000000000001',
  '<uuid do auth.users>',
  'admin'
);
```

4. **Settings → API** → copiar `URL`, `anon key`, `service_role key`.

---

## 2. Vercel (app web)

```bash
cd web
npx vercel login
npx vercel link    # projeto novo: extrato-pronto
```

### Variáveis — Production (e Preview)

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (server only) |
| `DEFAULT_ESCRITORIO_SLUG` | `e2-piloto` |
| `PLATFORM_ADMIN_EMAILS` | seu e-mail super admin |
| `INBOUND_EMAIL_SECRET` | secret gerado §0 |
| `WORKER_SECRET` | secret gerado §0 |
| `WHATSAPP_VERIFY_TOKEN` | secret gerado §0 |
| `WHATSAPP_APP_SECRET` | Meta App → Settings → Basic |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp → API Setup (temporário ou permanente) |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp → API Setup → Phone number ID |
| `REGUA_MODE` | `dry_run` (início) → `live` após webhook OK |
| `ANTHROPIC_API_KEY` | conversão PDF |
| `PDF_MODEL_PRIMARY` | `claude-sonnet-4-6` |
| `PDF_MODEL_FALLBACK` | `claude-opus-4-8` |

`CRON_SECRET` é injetado automaticamente pelo Vercel Cron após o primeiro deploy com `vercel.json`.

Deploy:

```bash
npx vercel --prod
```

Anote a URL: `https://<projeto>.vercel.app`

Confirme em **Project → Cron Jobs**: `/api/worker/process` (06:00 UTC) e `/api/worker/regua` (12:00 UTC). Plano Hobby: no máximo 1 execução/dia por cron — PDF na fila pode exigir chamada manual ao worker (ver §5).

---

## 3. Meta — WhatsApp Cloud API (sandbox / test number)

### 3.1 Criar app e ativar WhatsApp

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App** → tipo **Business** (ou Other → Business).
2. Adicionar produto **WhatsApp** → **Set up**.
3. Menu **WhatsApp → API Setup**:
   - Copiar **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - Copiar **WhatsApp Business Account ID** (anotar; templates)
   - **Temporary access token** (24 h) ou gerar token permanente (System User — recomendado antes do piloto):
     - Business Settings → Users → System users → Add → Generate token (perm `whatsapp_business_messaging`, `whatsapp_business_management`).

4. **App settings → Basic** → **App Secret** → `WHATSAPP_APP_SECRET` no Vercel.

### 3.2 Destinatários de teste (obrigatório no sandbox)

Em **API Setup → To**:

1. **Add phone number** → informe o celular que vai enviar/receber testes (formato internacional, ex. `5511999990001`).
2. Confirmar código SMS no aparelho.
3. Repita até 5 números (contadora + clientes piloto).

Só esses números recebem mensagens no modo teste.

### 3.3 Webhook (recepção de extratos + PARAR)

1. **WhatsApp → Configuration** (ou App → Webhooks).
2. **Callback URL:** `https://<projeto>.vercel.app/api/webhooks/whatsapp`
3. **Verify token:** exatamente o valor de `WHATSAPP_VERIFY_TOKEN` no Vercel.
4. **Verify and save** — a Meta faz `GET` com `hub.challenge`; precisa retornar 200.
5. Assinar o campo **`messages`** (Subscribe).

Teste manual do verify (substitua valores):

```bash
curl "https://<projeto>.vercel.app/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<WHATSAPP_VERIFY_TOKEN>&hub.challenge=12345"
# esperado: corpo "12345"
```

### 3.4 Cadastro no produto (roteamento)

O webhook usa `DEFAULT_ESCRITORIO_SLUG=e2-piloto` e faz match por **telefone** em `clientes.telefone`.

No seed, Alpha = `5511999990001`. O número de teste cadastrado na Meta deve bater com um cliente importado (mesmo E.164 sem `+`).

Import CSV ou SQL:

```sql
update public.clientes
set telefone = '5511999990001', regua_opt_in = true, contato_nome = 'Maria'
where cnpj = '12345678000199';
```

### 3.5 Enviar extrato via WhatsApp (teste)

Do celular verificado na Meta:

1. Abrir conversa com o **número de teste** exibido no API Setup.
2. Enviar arquivo **OFX ou PDF** como documento.
3. Painel → extrato deve aparecer (convertido ou triagem).

### 3.6 Régua em `live` (opcional nesta fase)

1. Submeter template `cobranca_extrato_pendente` (texto em `docs/piloto/templates-meta-whatsapp.md`) em **WhatsApp → Message templates**.
2. No sandbox, templates customizados podem ficar em review — use `hello_world` só para smoke de envio.
3. Quando template aprovado: Vercel → `REGUA_MODE=live` → redeploy.
4. Testar worker:

```bash
curl -X POST "https://<projeto>.vercel.app/api/worker/regua" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Ou **Cobrar agora** no painel (funciona em `dry_run` sem Meta).

### 3.7 Opt-out PARAR

Do celular cadastrado como cliente, enviar texto `PARAR` → `regua_opt_out_em` preenchido + resposta automática (em `live`; em `dry_run` só persiste opt-out).

---

## 4. Smoke test pós-deploy

```bash
BASE_URL=https://<projeto>.vercel.app INBOUND_EMAIL_SECRET=<secret> ./scripts/demo-e2.sh
```

Checklist manual:

- [ ] Login painel
- [ ] Import CSV ou seed visível
- [ ] Upload OFX → convertido
- [ ] Webhook verify Meta OK
- [ ] Documento WhatsApp → extrato no painel
- [ ] Cron jobs ativos no Vercel

---

## 5. Troubleshooting

| Sintoma | Causa provável |
|---|---|
| Webhook verify falha | `WHATSAPP_VERIFY_TOKEN` diferente entre Vercel e Meta |
| POST 401 Assinatura inválida | `WHATSAPP_APP_SECRET` errado ou body alterado por proxy |
| Extrato não associa cliente | Telefone do remetente ≠ `clientes.telefone` (normalizar E.164) |
| Download mídia falha | `WHATSAPP_ACCESS_TOKEN` expirado (token temp 24 h) |
| Régua não envia | `REGUA_MODE=dry_run` (esperado) ou template não aprovado |
| Coluna não existe | `npx supabase db push` no projeto cloud |
| Deploy Vercel: cron Hobby | Cron só 1×/dia — `vercel.json` já ajustado; PDF: `curl -X POST https://<dominio>/api/worker/process -H "x-worker-secret: $WORKER_SECRET"` após receber PDF |

---

## Referências

- `docs/deploy-piloto.md` — visão geral
- `docs/piloto/templates-meta-whatsapp.md` — templates utility
- `docs/superpowers/specs/2026-06-11-regua-cobranca-design.md` — 3 níveis de teste Meta
