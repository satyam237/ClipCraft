import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type SupabaseClientDatabase = SupabaseClient<Database>;
type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];

export async function getWorkspaces(
  supabase: SupabaseClient<Database>
): Promise<WorkspaceRow[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []) as WorkspaceRow[];
}

export async function createWorkspace(
  supabase: SupabaseClient<Database>,
  name: string,
  ownerId: string
): Promise<WorkspaceRow> {
  const values: Database["public"]["Tables"]["workspaces"]["Insert"] = {
    name,
    owner_id: ownerId,
  };

  const { data, error } = await (supabase
    .from("workspaces") as any)
    .insert(values)
    .select()
    .single();
  if (error) throw error;
  const workspace = data as WorkspaceRow;
  // Owner is already added by DB trigger on_workspace_created
  return workspace;
}

export async function getOrCreateDefaultWorkspace(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<WorkspaceRow> {
  const workspaces = await getWorkspaces(supabase);
  if (workspaces.length > 0) return workspaces[0];
  return createWorkspace(supabase, "My Workspace", userId);
}
