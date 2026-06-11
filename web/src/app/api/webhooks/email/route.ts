import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestExtrato } from "@/lib/pipeline/ingest";

type EmailPayload = {
  from: string;
  attachments?: Array<{
    filename: string;
    content_base64: string;
    mime?: string;
  }>;
  escritorio_slug?: string;
};

export async function POST(request: Request) {
  const secret = request.headers.get("x-inbound-secret");
  if (secret !== process.env.INBOUND_EMAIL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: EmailPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.from || !body.attachments?.length) {
    return NextResponse.json(
      { error: "Campos obrigatórios: from, attachments" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const results = [];

  for (const attachment of body.attachments) {
    const buffer = Buffer.from(attachment.content_base64, "base64");
    const result = await ingestExtrato(admin, {
      buffer,
      filename: attachment.filename,
      mime: attachment.mime,
      canal: "email",
      remetente: body.from,
      escritorioSlug: body.escritorio_slug,
    });
    results.push({ filename: attachment.filename, ...result });
  }

  return NextResponse.json({ ok: true, results });
}
