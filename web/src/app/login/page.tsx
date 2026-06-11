import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";

async function signIn(formData: FormData) {
  "use server";

  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    redirect("/login?error=credenciais");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=invalido");
  }

  redirect("/painel");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#15705f] to-[var(--accent)] text-base font-bold text-white shadow-md">
            EP
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Extrato Pronto
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Painel do escritório · piloto E2
          </p>
        </div>

        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-md)]">
          {params.error === "sem-escritorio" ? (
            <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              Sua conta existe, mas não está vinculada a um escritório. Peça ao
              super admin para vincular seu usuário, ou acesse{" "}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
                /admin
              </code>{" "}
              se você for super admin.
            </p>
          ) : params.error === "admin-negado" ? (
            <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Você não tem permissão de super admin.
            </p>
          ) : params.error ? (
            <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Não foi possível entrar. Verifique e-mail e senha.
            </p>
          ) : null}

          <form action={signIn} className="space-y-5">
            <Field label="E-mail" htmlFor="email">
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputClassName()}
              />
            </Field>

            <Field label="Senha" htmlFor="password">
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className={inputClassName()}
              />
            </Field>

            <Button type="submit" className="w-full">
              Entrar no painel
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-[var(--muted)]">
          Dev local: crie usuário no Supabase Auth e vincule em{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono ring-1 ring-[var(--border)]">
            escritorio_membros
          </code>
          .
        </p>
      </div>
    </div>
  );
}
