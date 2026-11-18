import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaces } from "@/lib/db/workspaces";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Video, FolderOpen } from "lucide-react";
import { DashboardVideoGrid } from "@/components/dashboard/DashboardVideoGrid";
import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [workspaces, videosRes, viewsRes] = await Promise.all([
    getWorkspaces(supabase as import("@/lib/db/workspaces").SupabaseClientDatabase),
    supabase
      .from("videos")
      .select("id, title, status, duration, thumbnail_url, created_at, workspace_id")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "view"),
  ]);
  if (videosRes.error) throw videosRes.error;
  if (viewsRes.error) throw viewsRes.error;

  const videosList = (videosRes.data as any[] | null) ?? [];
  const totalViews = (viewsRes.count ?? null) as number | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <CreateWorkspaceModal />
          <Button asChild>
            <Link href="/dashboard/record">
              <Plus className="mr-2 h-4 w-4" />
              New Recording
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm hover:shadow-md">
          <p className="text-sm text-[var(--muted-foreground)]">Total videos</p>
          <p className="text-3xl font-bold text-[var(--primary)]">{videosList.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm hover:shadow-md">
          <p className="text-sm text-[var(--muted-foreground)]">Total views</p>
          <p className="text-3xl font-bold text-[var(--primary)]">{totalViews ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm hover:shadow-md">
          <p className="text-sm text-[var(--muted-foreground)]">Workspaces</p>
          <p className="text-3xl font-bold text-[var(--primary)]">{workspaces.length}</p>
        </div>
      </div>

      {workspaces.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-[var(--muted-foreground)]">
              Create a workspace to organize your recordings, then start your
              first recording.
            </p>
            <CreateWorkspaceModal triggerLabel="Create workspace" />
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-4 text-lg font-medium">Recent videos</h2>
        <DashboardVideoGrid videos={videosList} />
      </section>
    </div>
  );
}
