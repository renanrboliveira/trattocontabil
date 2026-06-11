"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserEscritorioId } from "@/lib/supabase/server";
import { ingestExtrato } from "@/lib/pipeline/ingest";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function uploadExtratoAction(formData: FormData) {
  const escritorioId = await getUserEscritorioId();
  if (!escritorioId) {
    return { ok: false as const, message: "Não autenticado ou sem escritório" };
  }

  const file = formData.get("file");
  const clienteId = formData.get("cliente_id")?.toString();
  const bancoCodigo = formData.get("banco_codigo")?.toString();

  if (!(file instanceof File)) {
    return { ok: false as const, message: "Arquivo OFX obrigatório" };
  }

  const admin = createAdminClient();
  const { data: escritorio } = await admin
    .from("escritorios")
    .select("slug")
    .eq("id", escritorioId)
    .single();

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await ingestExtrato(admin, {
    buffer,
    filename: file.name,
    mime: file.type,
    canal: "upload",
    escritorioSlug: escritorio?.slug,
    clienteId: clienteId || undefined,
    bancoCodigo: bancoCodigo || undefined,
  });

  revalidatePath("/painel");

  return {
    ok:
      result.status === "convertido" ||
      result.status === "duplicado" ||
      result.status === "recebido",
    ...result,
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function previewClientesImportAction(formData: FormData) {
  const escritorioId = await getUserEscritorioId();
  if (!escritorioId) {
    return { ok: false as const, message: "Não autenticado" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false as const, message: "Arquivo CSV obrigatório" };
  }

  const content = await file.text();
  const { previewImport } = await import("@/lib/import/apply-clientes");
  const preview = previewImport(content);

  return { ok: true as const, preview, filename: file.name };
}

export async function applyClientesImportAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const escritorioId = await getUserEscritorioId();

  if (!escritorioId) {
    return { ok: false as const, message: "Não autenticado" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false as const, message: "Arquivo CSV obrigatório" };
  }

  const admin = createAdminClient();
  const { applyClientesImport } = await import("@/lib/import/apply-clientes");
  const result = await applyClientesImport(admin, {
    escritorioId,
    userId: user?.id ?? null,
    filename: file.name,
    content: await file.text(),
  });

  revalidatePath("/painel");

  return { ok: result.status !== "failed", result };
}

export async function exportAlterdataAction(extratoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const escritorioId = await getUserEscritorioId();

  if (!escritorioId) {
    return { ok: false as const, message: "Não autenticado" };
  }

  const admin = createAdminClient();
  const { createAlterdataExport } = await import("@/lib/export/create-export");
  const result = await createAlterdataExport(admin, {
    extratoId,
    escritorioId,
    userId: user?.id ?? null,
  });

  if (!result.ok) {
    return { ok: false as const, message: result.message };
  }

  revalidatePath(`/painel/extratos/${extratoId}`);
  revalidatePath("/painel");

  return {
    ok: true as const,
    exportId: result.exportId,
    filename: result.filename,
  };
}

export async function aprovarConversaoAction(extratoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const escritorioId = await getUserEscritorioId();

  if (!escritorioId || !user) {
    return { ok: false as const, message: "Não autenticado" };
  }

  const { data: extrato } = await supabase
    .from("extratos")
    .select("id, status, transacao_count")
    .eq("id", extratoId)
    .eq("escritorio_id", escritorioId)
    .maybeSingle();

  if (!extrato) {
    return { ok: false as const, message: "Extrato não encontrado" };
  }

  if (extrato.status !== "triagem") {
    return { ok: false as const, message: "Extrato não está em triagem" };
  }

  if ((extrato.transacao_count ?? 0) === 0) {
    return { ok: false as const, message: "Nenhuma transação para aprovar" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("extratos")
    .update({
      status: "convertido",
      aprovado_por: user.id,
      aprovado_em: new Date().toISOString(),
      triagem_motivo: null,
    })
    .eq("id", extratoId);

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath(`/painel/extratos/${extratoId}`);
  revalidatePath("/painel");

  return { ok: true as const, message: "Conversão aprovada" };
}

export async function cobrarAgoraAction(clienteId: string, competenciaId: string) {
  const escritorioId = await getUserEscritorioId();
  if (!escritorioId) {
    return { ok: false as const, message: "Não autenticado" };
  }

  const supabase = await createClient();
  const { data: competencia } = await supabase
    .from("competencias")
    .select("id, ano, mes")
    .eq("id", competenciaId)
    .eq("escritorio_id", escritorioId)
    .maybeSingle();

  if (!competencia) {
    return { ok: false as const, message: "Competência não encontrada" };
  }

  const admin = createAdminClient();
  const { cobrarClienteAgora } = await import("@/lib/regua/run");
  const result = await cobrarClienteAgora(admin, {
    escritorioId,
    clienteId,
    competenciaId: competencia.id,
    competenciaAno: competencia.ano,
    competenciaMes: competencia.mes,
  });

  revalidatePath("/painel");

  return result;
}
