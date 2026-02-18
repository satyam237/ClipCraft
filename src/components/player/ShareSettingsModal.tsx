"use client";

import { useState, useEffect } from "react";
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
import { UserPlus, X } from "lucide-react";

type ShareOption = "restricted" | "unlisted_view" | "unlisted_download" | "public" | "password";

const SHARE_OPTIONS: { value: ShareOption; label: string; description?: string }[] = [
  { value: "restricted", label: "Restricted", description: "Only people you add can view" },
  { value: "unlisted_view", label: "Anyone with the link can view", description: "View only, no download" },
  { value: "unlisted_download", label: "Anyone with the link can view and download" },
  { value: "public", label: "Public" },
  { value: "password", label: "Password protected" },
];

export function ShareSettingsModal({
  open,
  onOpenChange,
  videoId,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  title: string;
}) {
  const [visibility, setVisibility] = useState<string>("unlisted");
  const [allowDownload, setAllowDownload] = useState(true);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [invitees, setInvitees] = useState<{ id: string; email: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const supabase = createClient();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const watchUrl = `${baseUrl}/watch/${videoId}`;
  const embedCode = `<iframe src="${watchUrl}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;

  // Load current video settings when modal opens
  useEffect(() => {
    if (!open || !videoId) return;
    (async () => {
      const { data: video } = await supabase
        .from("videos")
        .select("visibility, allow_download")
        .eq("id", videoId)
        .single();
      if (video) {
        setVisibility(video.visibility ?? "unlisted");
        setAllowDownload(video.allow_download !== false);
      }
    })();
  }, [open, videoId]);

  // Load invitees when visibility is restricted
  useEffect(() => {
    if (!open || !videoId || visibility !== "restricted") return;
    (async () => {
      const { data: list } = await supabase
        .from("video_invitees")
        .select("id, email")
        .eq("video_id", videoId);
      setInvitees((list as { id: string; email: string }[]) ?? []);
    })();
  }, [open, videoId, visibility]);

  const hashPassword = async (plain: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const mapShareOptionToVisibility = (opt: ShareOption): { visibility: string; allow_download: boolean } => {
    if (opt === "restricted") return { visibility: "restricted", allow_download: false };
    if (opt === "unlisted_view") return { visibility: "unlisted", allow_download: false };
    if (opt === "unlisted_download") return { visibility: "unlisted", allow_download: true };
    if (opt === "public") return { visibility: "public", allow_download: true };
    if (opt === "password") return { visibility: "password", allow_download: false };
    return { visibility: "unlisted", allow_download: true };
  };

  const currentShareOption = (): ShareOption => {
    if (visibility === "restricted") return "restricted";
    if (visibility === "unlisted" && !allowDownload) return "unlisted_view";
    if (visibility === "unlisted" && allowDownload) return "unlisted_download";
    if (visibility === "public") return "public";
    if (visibility === "password") return "password";
    return "unlisted_download";
  };

  const handleSave = async () => {
    const opt = currentShareOption();
    const { visibility: vis, allow_download: allow } = mapShareOptionToVisibility(opt);
    let passwordHash: string | undefined;
    if (vis === "password" && password) {
      passwordHash = await hashPassword(password);
    }
    await supabase
      .from("videos")
      .update({
        visibility: vis,
        allow_download: allow,
        ...(passwordHash ? { password_hash: passwordHash } : {}),
      })
      .eq("id", videoId);
    setPassword("");
    onOpenChange(false);
  };

  const handleAddInvitee = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviteError(null);
    const { error } = await supabase.from("video_invitees").insert({
      video_id: videoId,
      email,
    });
    if (error) {
      setInviteError(error.message);
      return;
    }
    setInviteEmail("");
    const { data: list } = await supabase
      .from("video_invitees")
      .select("id, email")
      .eq("video_id", videoId);
    setInvitees((list as { id: string; email: string }[]) ?? []);
  };

  const handleRemoveInvitee = async (id: string) => {
    await supabase.from("video_invitees").delete().eq("id", id);
    setInvitees((prev) => prev.filter((i) => i.id !== id));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(watchUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
  };

  const setShareOption = (opt: ShareOption) => {
    const { visibility: vis, allow_download: allow } = mapShareOptionToVisibility(opt);
    setVisibility(vis);
    setAllowDownload(allow);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Share</CardTitle>
            <CardDescription>{title}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Who has access</Label>
            <select
              className="w-full rounded-md border border-(--input) bg-transparent px-3 py-2 text-sm"
              value={currentShareOption()}
              onChange={(e) => setShareOption(e.target.value as ShareOption)}
            >
              {SHARE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {SHARE_OPTIONS.find((o) => o.value === currentShareOption())?.description && (
              <p className="text-xs text-(--muted-foreground)">
                {SHARE_OPTIONS.find((o) => o.value === currentShareOption())?.description}
              </p>
            )}
          </div>

          {visibility === "restricted" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <UserPlus className="h-4 w-4" />
                Add people by email
              </Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddInvitee()}
                />
                <Button type="button" size="sm" onClick={handleAddInvitee}>
                  Add
                </Button>
              </div>
              {inviteError && (
                <p className="text-xs text-red-600 dark:text-red-400">{inviteError}</p>
              )}
              <ul className="space-y-1">
                {invitees.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-md border border-(--border) px-2 py-1.5 text-sm"
                  >
                    <span>{inv.email}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemoveInvitee(inv.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {visibility === "password" && (
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Optional"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Link</Label>
            <div className="flex gap-2">
              <Input readOnly value={watchUrl} className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={copyLink}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Embed</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={embedCode}
                className="font-mono text-xs"
                title={embedCode}
              />
              <Button variant="outline" size="sm" onClick={copyEmbed}>
                Copy embed
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
