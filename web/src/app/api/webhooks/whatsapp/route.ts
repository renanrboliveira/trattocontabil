import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestExtrato } from "@/lib/pipeline/ingest";

function verifyMetaSignature(payload: string, signature: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  // Fail closed: sem secret configurado, nenhuma requisição é aceita.
  if (!secret) return false;
  if (!signature) return false;
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN não configurado");

  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const meta = await metaRes.json();
  if (!meta.url) throw new Error("URL de mídia não retornada pela Meta");

  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Buffer.from(await fileRes.arrayBuffer());
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const admin = createAdminClient();
  const results: unknown[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages ?? [];
      for (const message of messages) {
        const from = message.from as string;

        if (message.type === "document" && message.document?.id) {
          const filename =
            message.document.filename ?? `extrato-${message.document.id}.ofx`;
          const buffer = await downloadWhatsAppMedia(message.document.id);
          const result = await ingestExtrato(admin, {
            buffer,
            filename,
            mime: message.document.mime_type,
            canal: "whatsapp",
            remetente: from,
          });
          results.push(result);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
