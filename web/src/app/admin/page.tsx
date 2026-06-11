import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, SignOutButton } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminUser } from "@/lib/platform-admin-server";
import { signOutAction } from "@/app/painel/actions";

export default async function AdminPage() {
  const user = await getPlatformAdminUser();
  if (!user) redirect("/login?error=admin-negado");

  const admin = createAdminClient();
  const { data: escritorios } = await admin
    .from("escritorios")
    .select("id, nome, slug, email_inbound, created_at, escritorio_membros(count)")
    .order("created_at", { ascending: false });

  return (
    <AppShell
      office={{ nome: "Super admin", meta: user.email ?? undefined }}
      nav={[
        {
          items: [
            { label: "Escritórios", href: "/admin", icon: "▤", active: true },
            { label: "Painel", href: "/painel", icon: "▦" },
          ],
        },
      ]}
      title="Escritórios"
      actions={
        <Link href="/admin/escritorios/novo">
          <Button>Novo escritório</Button>
        </Link>
      }
      signOut={<SignOutButton action={signOutAction} />}
    >
      <DataTable>
        <DataTableHead>
          <DataTableTh>Nome</DataTableTh>
          <DataTableTh>Slug</DataTableTh>
          <DataTableTh>E-mail inbound</DataTableTh>
          <DataTableTh>Membros</DataTableTh>
          <DataTableTh></DataTableTh>
        </DataTableHead>
        <DataTableBody>
          {(escritorios ?? []).length === 0 && (
            <DataTableRow>
              <DataTableTd colSpan={5} className="py-10 text-center text-[var(--muted)]">
                Nenhum escritório cadastrado.
              </DataTableTd>
            </DataTableRow>
          )}
          {(escritorios ?? []).map((escritorio) => {
            const membrosCount = Array.isArray(escritorio.escritorio_membros)
              ? escritorio.escritorio_membros[0]?.count ?? 0
              : 0;

            return (
              <DataTableRow key={escritorio.id}>
                <DataTableTd className="font-semibold">
                  {escritorio.nome}
                </DataTableTd>
                <DataTableTd className="font-mono text-[var(--muted-foreground)]">
                  {escritorio.slug}
                </DataTableTd>
                <DataTableTd className="text-[var(--muted-foreground)]">
                  {escritorio.email_inbound ?? "—"}
                </DataTableTd>
                <DataTableTd>{membrosCount}</DataTableTd>
                <DataTableTd align="right">
                  <Link
                    href={`/admin/escritorios/${escritorio.id}`}
                    className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
                  >
                    Gerenciar →
                  </Link>
                </DataTableTd>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </AppShell>
  );
}
