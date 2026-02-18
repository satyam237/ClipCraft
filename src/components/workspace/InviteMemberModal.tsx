"use client";

import { useState } from "react";
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

export function InviteMemberModal({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const supabase = createClient();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ type: "error", text: "Not signed in" });
      setLoading(false);
      return;
    }

    // MVP behavior: record intent to invite via email in a separate table when available.
    // For now, avoid incorrectly adding the current user as a member.
    setMessage({
      type: "error",
      text: "Invites by email are not fully implemented yet. This form does not add members automatically.",
    });
    setEmail("");
    setLoading(false);
  };

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Invite member</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Invite member</CardTitle>
            <CardDescription>
              Enter email to invite. (MVP: invite flow uses same user for demo.)
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleInvite}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                disabled={loading}
              />
            </div>
            {message && (
              <p className={`text-sm ${message.type === "error" ? "text-[var(--destructive)]" : "text-green-600"}`}>
                {message.text}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send invite"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
