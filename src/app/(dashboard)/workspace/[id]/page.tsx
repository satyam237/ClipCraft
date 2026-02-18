import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteMemberModal } from "@/components/workspace/InviteMemberModal";
import { CreateFolderModal } from "@/components/workspace/CreateFolderModal";

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single();

  if (wsError || !workspace) {
    redirect("/workspace");
  }

  const { data: members } = await supabase
    .from("workspace_members")
    .select("id, user_id, role")
    .eq("workspace_id", id);

  const { data: folders } = await supabase
    .from("folders")
    .select("id, name")
    .eq("workspace_id", id)
    .is("parent_folder_id", null)
    .order("name");

  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, status, created_at")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{workspace.name}</h1>
        <InviteMemberModal workspaceId={id} />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Folders</CardTitle>
            <CreateFolderModal workspaceId={id} />
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(folders ?? []).map((f: { id: string; name: string }) => (
                <li key={f.id} className="text-sm">{f.name}</li>
              ))}
              {(!folders || folders.length === 0) && (
                <li className="text-sm text-[var(--muted-foreground)]">No folders</li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(members ?? []).map((m: { id: string; user_id: string; role: string }) => (
                <li key={m.id} className="flex justify-between text-sm">
                  <span className="font-mono text-xs text-[var(--muted-foreground)]">{m.user_id.slice(0, 8)}…</span>
                  <span className="text-[var(--muted-foreground)]">{m.role}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent videos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(videos ?? []).slice(0, 5).map((v: { id: string; title: string; status: string }) => (
                <li key={v.id}>
                  <a href={`/videos/${v.id}`} className="text-sm hover:underline">
                    {v.title} ({v.status})
                  </a>
                </li>
              ))}
              {(!videos || videos.length === 0) && (
                <li className="text-sm text-[var(--muted-foreground)]">No videos yet</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
