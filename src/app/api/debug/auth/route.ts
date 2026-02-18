import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const supabase = await createClient();
  const [{ data: userRes, error: userError }, { data: sessionRes, error: sessionError }] =
    await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);

  return NextResponse.json({
    request: {
      host: headerStore.get("host"),
      origin: headerStore.get("origin"),
      userAgent: headerStore.get("user-agent"),
    },
    cookies: {
      names: cookieStore.getAll().map((c) => c.name),
      count: cookieStore.getAll().length,
    },
    auth: {
      user: userRes.user
        ? { id: userRes.user.id, email: userRes.user.email }
        : null,
      hasSession: Boolean(sessionRes.session),
      userError: userError?.message ?? null,
      sessionError: sessionError?.message ?? null,
    },
  });
}

