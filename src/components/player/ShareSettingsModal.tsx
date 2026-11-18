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
import { UserPlus, X, Lock, Clock, Eye } from "lucide-react";
import { useRevenueCat } from "@/lib/revenuecat/provider";
import { canUseShareFeature } from "@/lib/plan-enforcement";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";

type ShareOption = "restricted" | "unlisted_view" | "unlisted_download" | "public" | "password";

const SHARE_OPTIONS: { value: ShareOption; label: string; description?: string }[] = [
  { value: "restricted", label: "Restricted", description: "Only people you add can view" },
  { value: "unlisted_view", label: "Anyone with the link can view", description: "View only, no download" },
  { value: "unlisted_download", label: "Anyone with the link can view and download" },
  { value: "public", label: "Public" },
  { value: "password", label: "Password protected" },
];

function generateToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

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
  const { currentPlan } = useRevenueCat();
  const [visibility, setVisibility] = useState<string>("unlisted");
  const [allowDownload, setAllowDownload] = useState(true);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [invitees, setInvitees] = useState<{ id: string; email: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const supabase = createClient();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const watchUrl = shareToken
    ? `${baseUrl}/watch/${videoId}?token=${shareToken}`
    : `${baseUrl}/watch/${videoId}`;
  const embedCode = `<iframe src="${watchUrl}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;

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

      const { data: existingToken } = await supabase
        .from("share_tokens")
        .select("token, expires_at, max_views")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingToken) {
        setShareToken(existingToken.token);
        setExpiresAt(existingToken.expires_at ?? "");
        setMaxViews(existingToken.max_views?.toString() ?? "");
      }
    })();
  }, [open, videoId]);

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
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const tokenValue = shareToken ?? generateToken();
      await supabase.from("share_tokens").upsert(
        {
          video_id: videoId,
          token: tokenValue,
          created_by: user.id,
          expires_at: expiresAt || null,
          max_views: maxViews ? parseInt(maxViews, 10) : null,
          require_password: vis === "password",
          allow_download: allow,
          allowed_emails:
            vis === "restricted" ? invitees.map((i) => i.email) : null,
        },
        { onConflict: "token" }
      );
      setShareToken(tokenValue);
    }

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

  const passwordGate = canUseShareFeature(currentPlan, "password");
  const expiryGate = canUseShareFeature(currentPlan, "expiry");
  const maxViewsGate = canUseShareFeature(currentPlan, "maxViews");
  const inviteGate = canUseShareFeature(currentPlan, "inviteOnly");
  const embedGate = canUseShareFeature(currentPlan, "embedCode");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
              className="w-full rounded-xl border border-(--input) bg-[var(--card)] px-3 py-2 text-sm"
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
              {!inviteGate.allowed ? (
                <UpgradePrompt message={inviteGate.reason!} />
              ) : (
                <>
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
                        className="flex items-center justify-between rounded-xl border border-(--border) px-2 py-1.5 text-sm"
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
                </>
              )}
            </div>
          )}

          {visibility === "password" && (
            <div className="space-y-2">
              {!passwordGate.allowed ? (
                <UpgradePrompt message={passwordGate.reason!} />
              ) : (
                <>
                  <Label className="flex items-center gap-1.5">
                    <Lock className="h-4 w-4" />
                    Password
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set a password for this link"
                  />
                </>
              )}
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-(--border) bg-(--muted)/30 p-3">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Advanced restrictions
            </h4>
            <div className="space-y-2">
              <Label>Expiration date</Label>
              {!expiryGate.allowed ? (
                <UpgradePrompt message={expiryGate.reason!} className="text-xs" />
              ) : (
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                Max views
              </Label>
              {!maxViewsGate.allowed ? (
                <UpgradePrompt message={maxViewsGate.reason!} className="text-xs" />
              ) : (
                <Input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                />
              )}
            </div>
          </div>

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
            {!embedGate.allowed ? (
              <UpgradePrompt message={embedGate.reason!} className="text-xs" />
            ) : (
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
            )}
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
