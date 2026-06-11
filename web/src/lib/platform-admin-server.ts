import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export async function getPlatformAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return null;
  }

  return user;
}

export async function requirePlatformAdmin() {
  const user = await getPlatformAdminUser();
  if (!user) {
    throw new Error("Acesso negado — super admin apenas");
  }
  return user;
}
