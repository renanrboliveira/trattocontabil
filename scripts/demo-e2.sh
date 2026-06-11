#!/usr/bin/env bash
# Demo E2 — valida fluxo ponta a ponta (local).
# Pré-requisitos: npx supabase start && npm run dev (porta 3001)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/web"
BASE_URL="${BASE_URL:-http://localhost:3001}"
EMAIL_SECRET="${INBOUND_EMAIL_SECRET:-dev-email-secret}"
SAMPLE_OFX="$WEB/fixtures/sample.ofx"

if [[ ! -f "$SAMPLE_OFX" ]]; then
  echo "❌ Arquivo não encontrado: $SAMPLE_OFX"
  exit 1
fi

echo "→ Demo E2 em $BASE_URL"
echo ""

echo "1/3 Ingest OFX via webhook e-mail (Alpha / Itaú)…"
B64="$(base64 -i "$SAMPLE_OFX" | tr -d '\n')"
INGEST=$(curl -sf -X POST "$BASE_URL/api/webhooks/email" \
  -H "Content-Type: application/json" \
  -H "x-inbound-secret: $EMAIL_SECRET" \
  -d "{
    \"from\": \"alpha@cliente.example.com\",
    \"attachments\": [{
      \"filename\": \"sample.ofx\",
      \"content_base64\": \"$B64\"
    }]
  }")
echo "$INGEST" | python3 -m json.tool 2>/dev/null || echo "$INGEST"

STATUS=$(echo "$INGEST" | python3 -c "import sys,json; r=json.load(sys.stdin)['results'][0]; print(r.get('status',''))" 2>/dev/null || true)
if [[ "$STATUS" != "convertido" && "$STATUS" != "duplicado" ]]; then
  echo "❌ Esperado status convertido ou duplicado, recebeu: $STATUS"
  exit 1
fi
echo "✓ Ingest OK ($STATUS)"
echo ""

echo "2/3 Idempotência — reenvio do mesmo arquivo…"
DUP=$(curl -sf -X POST "$BASE_URL/api/webhooks/email" \
  -H "Content-Type: application/json" \
  -H "x-inbound-secret: $EMAIL_SECRET" \
  -d "{
    \"from\": \"alpha@cliente.example.com\",
    \"attachments\": [{
      \"filename\": \"sample.ofx\",
      \"content_base64\": \"$B64\"
    }]
  }")
DUP_STATUS=$(echo "$DUP" | python3 -c "import sys,json; r=json.load(sys.stdin)['results'][0]; print(r.get('status',''))" 2>/dev/null || true)
if [[ "$DUP_STATUS" != "duplicado" ]]; then
  echo "❌ Reenvio deveria retornar duplicado, recebeu: $DUP_STATUS"
  exit 1
fi
echo "✓ Idempotência OK"
echo ""

echo "3/3 Export Alterdata — use o painel:"
echo "   $BASE_URL/painel → extrato convertido → Exportar Alterdata (CSV)"
echo "   Importe no Alterdata da E2 e documente em docs/knowledge/layouts-importacao/alterdata/field-mapping.md"
echo ""
echo "Demo automatizada concluída. Próximo: validar import no Alterdata (Etapa 0)."
