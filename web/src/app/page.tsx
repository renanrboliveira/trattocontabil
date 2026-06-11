import { redirect } from "next/navigation";
import { createClient, getUserEscritorioId } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const escritorioId = await getUserEscritorioId();
  if (escritorioId) {
    redirect("/painel");
  }

  if (isPlatformAdminEmail(user.email)) {
    redirect("/admin");
  }

  redirect("/login?error=sem-escritorio");
}
