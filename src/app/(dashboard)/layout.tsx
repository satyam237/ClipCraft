import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) {
    const errorCode =
      userError?.message?.toLowerCase().includes("auth session missing")
        ? "session_missing"
        : "unauthenticated";
    redirect(`/login?next=/dashboard&error=${errorCode}`);
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
