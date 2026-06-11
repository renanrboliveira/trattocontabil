"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalized
    );
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

export async function createEscritorioAction(formData: FormData) {
  await requirePlatformAdmin();

  const nome = formData.get("nome")?.toString().trim();
  const slugInput = formData.get("slug")?.toString().trim();
  const emailInbound = formData.get("email_inbound")?.toString().trim() || null;

  if (!nome) {
    throw new Error("Nome é obrigatório");
  }

  const slug = slugInput || slugify(nome);
  if (!slug) {
    throw new Error("Slug inválido");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("escritorios")
    .insert({ nome, slug, email_inbound: emailInbound })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.code === "23505" ? "Slug já existe" : error.message);
  }

  revalidatePath("/admin");
  redirect(`/admin/escritorios/${data.id}`);
}

export async function addMembroAction(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData
) {
  await requirePlatformAdmin();

  const escritorioId = formData.get("escritorio_id")?.toString();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const role = formData.get("role")?.toString() === "operador" ? "operador" : "admin";
  const password = formData.get("password")?.toString();

  if (!escritorioId || !email) {
    return { ok: false as const, message: "Escritório e e-mail são obrigatórios" };
  }

  const admin = createAdminClient();
  let user = await findAuthUserByEmail(admin, email);
  let createdPassword: string | null = null;

  if (!user) {
    createdPassword = password?.trim() || crypto.randomUUID().slice(0, 12);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: createdPassword,
      email_confirm: true,
    });
    if (error) {
      return { ok: false as const, message: error.message };
    }
    user = data.user;
  }

  const { error: linkError } = await admin.from("escritorio_membros").upsert(
    {
      escritorio_id: escritorioId,
      user_id: user.id,
      role,
    },
    { onConflict: "escritorio_id,user_id" }
  );

  if (linkError) {
    return { ok: false as const, message: linkError.message };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/escritorios/${escritorioId}`);

  return {
    ok: true as const,
    message: createdPassword
      ? `Usuário criado. Senha inicial: ${createdPassword}`
      : "Usuário vinculado ao escritório",
  };
}

export async function removeMembroAction(formData: FormData) {
  await requirePlatformAdmin();

  const membroId = formData.get("membro_id")?.toString();
  const escritorioId = formData.get("escritorio_id")?.toString();

  if (!membroId || !escritorioId) {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("escritorio_membros").delete().eq("id", membroId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/escritorios/${escritorioId}`);
}
