import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminUser } from "@/lib/platform-admin-server";
import { removeMembroAction } from "@/app/admin/actions";
import { AddMembroForm } from "@/app/admin/escritorios/[id]/add-membro-form";
import { Button } from "@/components/ui/button";

export default async function EscritorioAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getPlatformAdminUser();
  if (!user) redirect("/login?error=admin-negado");

  const admin = createAdminClient();
  const { data: escritorio } = await admin
    .from("escritorios")
    .select("id, nome, slug, email_inbound")
    .eq("id", id)
    .maybeSingle();

  if (!escritorio) notFound();

  const { data: membros } = await admin
    .from("escritorio_membros")
    .select("id, user_id, role, created_at")
    .eq("escritorio_id", id)
    .order("created_at");

  const usersById = new Map<string, string>();
  for (const membro of membros ?? []) {
    const { data: authUser } = await admin.auth.admin.getUserById(membro.user_id);
    usersById.set(membro.user_id, authUser.user?.email ?? membro.user_id);
  }

  return (
    <AppShell
      office={{ nome: "Super admin" }}
      nav={[{ items: [{ label: "← Escritórios", href: "/admin", icon: "▤" }] }]}
      title={escritorio.nome}
      topbarExtra={
        <span className="font-mono text-xs text-[var(--muted)]">{escritorio.slug}</span>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Membros do escritório">
          <ul className="divide-y divide-[var(--border)]">
            {(membros ?? []).length === 0 && (
              <li className="py-6 text-center text-sm text-[var(--muted)]">
                Nenhum usuário vinculado.
              </li>
            )}
            {(membros ?? []).map((membro) => (
              <li
                key={membro.id}
                className="flex flex-wrap items-center gap-3 py-4"
              >
                <span className="font-semibold text-[var(--foreground)]">
                  {usersById.get(membro.user_id)}
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {membro.role}
                </span>
                <form action={removeMembroAction} className="ml-auto">
                  <input type="hidden" name="membro_id" value={membro.id} />
                  <input type="hidden" name="escritorio_id" value={id} />
                  <Button type="submit" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                    Remover
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Vincular usuário"
          description="Se o e-mail não existir no Auth, um usuário será criado com senha inicial."
        >
          <AddMembroForm escritorioId={id} />
        </Card>
      </div>
    </AppShell>
  );
}
