import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicApi =
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/worker");

  if (isPublicApi) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = pathname.startsWith("/login");
  const isAdminPage = pathname.startsWith("/admin");
  const isPlatformAdmin = isPlatformAdminEmail(user?.email);

  let hasEscritorio = false;
  if (user) {
    const { data: membro } = await supabase
      .from("escritorio_membros")
      .select("escritorio_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    hasEscritorio = !!membro?.escritorio_id;
  }

  if (!user && !isAuthPage && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAdminPage && !isPlatformAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "admin-negado");
    return NextResponse.redirect(url);
  }

  if (user && !hasEscritorio && pathname.startsWith("/painel")) {
    const url = request.nextUrl.clone();
    url.pathname = isPlatformAdmin ? "/admin" : "/login";
    if (!isPlatformAdmin) {
      url.searchParams.set("error", "sem-escritorio");
    }
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname =
      hasEscritorio ? "/painel" : isPlatformAdmin ? "/admin" : "/login";
    if (!hasEscritorio && !isPlatformAdmin) {
      url.searchParams.set("error", "sem-escritorio");
    }
    if (url.pathname !== pathname || url.search !== request.nextUrl.search) {
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
