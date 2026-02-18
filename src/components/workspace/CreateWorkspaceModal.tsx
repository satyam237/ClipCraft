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
      setError(workspaceError?.message ?? "Failed to create workspace");
      setLoading(false);
      return;
    }

    // Owner is already added by DB trigger on_workspace_created
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
