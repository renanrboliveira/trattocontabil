import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createEscritorioAction } from "@/app/admin/actions";
import { getPlatformAdminUser } from "@/lib/platform-admin-server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";

export default async function NovoEscritorioPage() {
  const user = await getPlatformAdminUser();
  if (!user) redirect("/login?error=admin-negado");

  return (
    <AppShell
      office={{ nome: "Super admin" }}
      nav={[{ items: [{ label: "← Escritórios", href: "/admin", icon: "▤" }] }]}
      title="Novo escritório"
    >
      <Card title="Dados do escritório" className="max-w-xl">
        <form action={createEscritorioAction} className="space-y-5">
          <Field label="Nome" htmlFor="nome">
            <input
              id="nome"
              name="nome"
              required
              className={inputClassName()}
              placeholder="Escritório E2 (piloto)"
            />
          </Field>

          <Field label="Slug" htmlFor="slug" hint="Opcional — gerado automaticamente a partir do nome">
            <input
              id="slug"
              name="slug"
              className={`${inputClassName()} font-mono`}
              placeholder="e2-piloto"
            />
          </Field>

          <Field label="E-mail inbound" htmlFor="email_inbound">
            <input
              id="email_inbound"
              name="email_inbound"
              type="email"
              className={inputClassName()}
              placeholder="e2@inbound.extratopronto.local"
            />
          </Field>

          <Button type="submit">Criar escritório</Button>
        </form>
      </Card>
    </AppShell>
  );
}
