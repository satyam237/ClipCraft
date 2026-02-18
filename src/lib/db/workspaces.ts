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
    // #region agent log
    const logData = {code:error.code,message:error.message,hint:error.hint,details:error.details,location:'workspaces.ts:14'};
    try{await fetch('http://127.0.0.1:7471/ingest/d49c29af-54e8-4fb9-820b-95829aad8cc5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'70d4ca'},body:JSON.stringify({sessionId:'70d4ca',location:'workspaces.ts:14',message:'getWorkspaces error',data:logData,timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});}catch(e){}
    // #endregion
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
  const memberInsert = await (supabase.from("workspace_members") as any).insert({
      workspace_id: workspace.id,
      user_id: ownerId,
      role: "owner",
    });
  if (
    memberInsert.error &&
    !/duplicate key value|already exists/i.test(memberInsert.error.message)
  ) {
    throw memberInsert.error;
  }
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
