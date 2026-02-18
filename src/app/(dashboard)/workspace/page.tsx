import { createClient } from "@/lib/supabase/server";
import { getWorkspaces } from "@/lib/db/workspaces";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import { FolderOpen } from "lucide-react";
import Link from "next/link";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const workspaces = await getWorkspaces(supabase as import("@/lib/db/workspaces").SupabaseClientDatabase);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Workspaces</h1>
        <CreateWorkspaceModal />
      </div>
      {workspaces.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No workspaces</CardTitle>
            <CardDescription>
              Create a workspace to organize your recordings and invite your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateWorkspaceModal triggerLabel="Create your first workspace" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/workspace/${ws.id}`}>
              <Card className="transition-colors hover:bg-[var(--accent)]/50">
                <CardHeader className="flex flex-row items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-[var(--muted-foreground)]" />
                  <CardTitle className="text-lg">{ws.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Manage videos and members
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
