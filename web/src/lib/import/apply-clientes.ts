import type { SupabaseClient } from "@supabase/supabase-js";
import {
  groupRowsByCnpj,
  previewClientesCsv,
  type ImportApplyResult,
  type ImportPreview,
} from "@/lib/import/clientes-csv";

export function previewImport(content: string): ImportPreview {
  return previewClientesCsv(content);
}

export async function applyClientesImport(
  admin: SupabaseClient,
  params: {
    escritorioId: string;
    userId: string | null;
    filename: string;
    content: string;
  }
): Promise<ImportApplyResult> {
  const preview = previewClientesCsv(params.content);

  if (preview.rows.length === 0) {
    return {
      status: "failed",
      clientesCriados: 0,
      clientesAtualizados: 0,
      bancosCriados: 0,
      bancosAtualizados: 0,
      errors: preview.errors.length
        ? preview.errors
        : [{ line: 0, message: "Nenhuma linha válida" }],
    };
  }

  const grouped = groupRowsByCnpj(preview.rows);
  const applyErrors: ImportApplyResult["errors"] = [...preview.errors];

  let clientesCriados = 0;
  let clientesAtualizados = 0;
  let bancosCriados = 0;
  let bancosAtualizados = 0;

  for (const [cnpj, data] of grouped) {
    const { data: existing } = await admin
      .from("clientes")
      .select("id")
      .eq("escritorio_id", params.escritorioId)
      .eq("cnpj", cnpj)
      .maybeSingle();

    let clienteId = existing?.id;

    if (existing) {
      const { error } = await admin
        .from("clientes")
        .update({
          razao_social: data.razao_social,
          telefone: data.telefone ?? null,
          email: data.email ?? null,
          ativo: true,
        })
        .eq("id", existing.id);

      if (error) {
        applyErrors.push({ line: 0, message: `CNPJ ${cnpj}: ${error.message}` });
        continue;
      }
      clientesAtualizados += 1;
      clienteId = existing.id;
    } else {
      const { data: inserted, error } = await admin
        .from("clientes")
        .insert({
          escritorio_id: params.escritorioId,
          cnpj,
          razao_social: data.razao_social,
          telefone: data.telefone ?? null,
          email: data.email ?? null,
          ativo: true,
        })
        .select("id")
        .single();

      if (error || !inserted) {
        applyErrors.push({
          line: 0,
          message: `CNPJ ${cnpj}: ${error?.message ?? "falha ao criar"}`,
        });
        continue;
      }
      clientesCriados += 1;
      clienteId = inserted.id;
    }

    for (const banco of data.bancos) {
      const { data: existingBanco } = await admin
        .from("cliente_bancos")
        .select("id")
        .eq("cliente_id", clienteId!)
        .eq("banco_codigo", banco.banco_codigo)
        .eq("conta_ref", banco.conta_ref)
        .maybeSingle();

      if (existingBanco) {
        const { error } = await admin
          .from("cliente_bancos")
          .update({ banco_nome: banco.banco_nome })
          .eq("id", existingBanco.id);

        if (error) {
          applyErrors.push({
            line: banco.line,
            message: error.message,
          });
        } else {
          bancosAtualizados += 1;
        }
      } else {
        const { error } = await admin
          .from("cliente_bancos")
          .insert({
            cliente_id: clienteId!,
            banco_codigo: banco.banco_codigo,
            banco_nome: banco.banco_nome,
            conta_ref: banco.conta_ref,
          });

        if (error) {
          applyErrors.push({
            line: banco.line,
            message: error.message,
          });
        } else {
          bancosCriados += 1;
        }
      }
    }
  }

  const status =
    applyErrors.length === 0
      ? "completed"
      : clientesCriados + clientesAtualizados > 0
        ? "partial"
        : "failed";

  const { data: batch } = await admin
    .from("clientes_import_batches")
    .insert({
      escritorio_id: params.escritorioId,
      filename: params.filename,
      status,
      total_rows: preview.stats.totalLines,
      clientes_criados: clientesCriados,
      clientes_atualizados: clientesAtualizados,
      bancos_criados: bancosCriados,
      bancos_atualizados: bancosAtualizados,
      erros: applyErrors,
      created_by: params.userId,
    })
    .select("id")
    .single();

  return {
    status,
    clientesCriados,
    clientesAtualizados,
    bancosCriados,
    bancosAtualizados,
    errors: applyErrors,
    batchId: batch?.id,
  };
}
