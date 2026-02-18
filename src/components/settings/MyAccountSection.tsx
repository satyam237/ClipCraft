"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/app/(dashboard)/settings/actions";
import type { User } from "@supabase/supabase-js";

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  plan: string | null;
} | null;

export function MyAccountSection({
  user,
  profile,
}: {
  user: User;
  profile: Profile;
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"success" | "error" | null>(null);

  const avatarUrl =
    (profile?.avatar_url as string | undefined) ??
    (user.user_metadata?.avatar_url as string | undefined);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const result = await updateProfile({ display_name: displayName || null });
    setSaving(false);
    setMessage(result.error ? "error" : "success");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage on ClipCraft</CardTitle>
          <CardDescription>Your account details and profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--muted)] text-2xl font-medium text-[var(--muted-foreground)]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                (user.email ?? "?").slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="space-y-2">
                <Label htmlFor="display_name">Full name</Label>
                <Input
                  id="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="max-w-sm"
                />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Change your name and photo here. Photo can be updated via your
                auth provider.
              </p>
            </div>
          </div>
          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-sm">
              <span className="text-[var(--muted-foreground)]">Email:</span>{" "}
              {user.email ?? "—"}
            </p>
            <p className="mt-1 text-sm">
              <span className="text-[var(--muted-foreground)]">Plan:</span>{" "}
              {profile?.plan ?? "free"}
            </p>
          </div>
          {message === "success" && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Profile updated.
            </p>
          )}
          {message === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to update. Try again.
            </p>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
