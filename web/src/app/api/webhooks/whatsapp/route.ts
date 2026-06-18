import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestExtrato } from "@/lib/pipeline/ingest";
import {
  matchClienteByRemetente,
  resolveEscritorioBySlug,
} from "@/lib/pipeline/routing";
import { normalizeOptOutText } from "@/lib/regua/dates";
import { sendSessionText } from "@/lib/whatsapp/send";
import { verifyMetaSignature } from "@/lib/whatsapp/verify-signature";

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
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (
    mode === "subscribe" &&
    expected &&
    token?.trim() === expected &&
    challenge
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
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
  const slug = process.env.DEFAULT_ESCRITORIO_SLUG ?? "e2-piloto";

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      // DEBUG temporário: motivo real de não-entrega (status failed + errors). Remover após diagnóstico.
      for (const status of change.value?.statuses ?? []) {
        console.info("[whatsapp][status]", {
          status: status.status,
          recipient: status.recipient_id,
          errors: status.errors,
        });
      }

      const messages = change.value?.messages ?? [];
      for (const message of messages) {
        const from = message.from as string;
        // DEBUG temporário: descobrir o wa_id canônico (9º dígito). Remover após diagnóstico.
        console.info("[whatsapp][inbound]", {
          from,
          type: message.type,
          wa_id: change.value?.contacts?.[0]?.wa_id ?? null,
        });

        if (message.type === "text" && message.text?.body) {
          const normalized = normalizeOptOutText(message.text.body);
          if (normalized === "parar") {
            const escritorio = await resolveEscritorioBySlug(admin, slug);
            const cliente = await matchClienteByRemetente(
              admin,
              escritorio.id,
              from,
              "whatsapp"
            );

            if (cliente) {
              await admin
                .from("clientes")
                .update({ regua_opt_out_em: new Date().toISOString() })
                .eq("id", cliente.clienteId);

              const confirmacao = await sendSessionText({
                to: from,
                text: "Lembretes automáticos desativados. Para reativar, fale com seu contador.",
              });

              results.push({
                type: "opt_out",
                clienteId: cliente.clienteId,
                ok: confirmacao.ok,
              });
            }
            continue;
          }
        }

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
