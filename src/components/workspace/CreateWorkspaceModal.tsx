"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export function CreateWorkspaceModal({
  triggerLabel = "New workspace",
}: {
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in");
      setLoading(false);
      return;
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({
        name: name || "My Workspace",
        owner_id: user.id,
      })
      .select("id")
      .single();

    if (workspaceError || !workspace) {
      // #region agent log
      fetch('http://127.0.0.1:7471/ingest/d49c29af-54e8-4fb9-820b-95829aad8cc5', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '70d4ca' }, body: JSON.stringify({ sessionId: '70d4ca', location: 'CreateWorkspaceModal.tsx:52', message: 'Workspace create error in modal', data: { code: workspaceError?.code, message: workspaceError?.message, hint: workspaceError?.hint, details: workspaceError?.details, hasWorkspace: !!workspace }, timestamp: Date.now(), runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion
      setError(workspaceError?.message ?? "Failed to create workspace");
      setLoading(false);
      return;
    }

    // Best-effort: older DB policies/triggers may not auto-create the owner membership row yet.
    const { error: memberError } = await supabase.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });
    if (memberError && !/duplicate key value|already exists/i.test(memberError.message)) {
      // #region agent log
      fetch('http://127.0.0.1:7471/ingest/d49c29af-54e8-4fb9-820b-95829aad8cc5', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '70d4ca' }, body: JSON.stringify({ sessionId: '70d4ca', location: 'CreateWorkspaceModal.tsx:64', message: 'Workspace member insert error in modal', data: { code: memberError.code, message: memberError.message, hint: memberError.hint, details: memberError.details, workspaceId: workspace.id, userId: user.id }, timestamp: Date.now(), runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
      // #endregion
      setError(memberError.message);
      setLoading(false);
      return;
    }

    setOpen(false);
    setName("");
    setLoading(false);
    router.refresh();
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>{triggerLabel}</Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Create workspace</CardTitle>
            <CardDescription>
              Add a workspace to organize your videos and team.
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Name</Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-(--destructive)">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
