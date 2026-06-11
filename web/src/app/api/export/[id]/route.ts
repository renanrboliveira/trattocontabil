import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membro } = await supabase
    .from("escritorio_membros")
    .select("escritorio_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membro) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: exportacao } = await supabase
    .from("exportacoes")
    .select("arquivo_nome, storage_path, escritorio_id")
    .eq("id", id)
    .eq("escritorio_id", membro.escritorio_id)
    .maybeSingle();

  if (!exportacao) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: file, error } = await admin.storage
    .from("extratos")
    .download(exportacao.storage_path);

  if (error || !file) {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportacao.arquivo_nome}"`,
    },
  });
}
