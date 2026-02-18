import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getWorkspaces } from "@/lib/db/workspaces";

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

  let workspaceLabel = "Personal";
  let memberCount = 1;
  try {
    const workspaces = await getWorkspaces(
      supabase as import("@/lib/db/workspaces").SupabaseClientDatabase
    );
    if (workspaces.length > 0) {
      workspaceLabel = workspaces[0].name;
      const { count } = await supabase
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaces[0].id);
      memberCount = count ?? 1;
    }
  } catch {
    // use defaults
  }

  return (
    <DashboardShell
      user={user}
      workspaceLabel={workspaceLabel}
      memberCount={memberCount}
    >
      {children}
    </DashboardShell>
  );
}
