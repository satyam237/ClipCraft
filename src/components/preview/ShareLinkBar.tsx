"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Link2, MoreHorizontal } from "lucide-react";
import { ShareSettingsModal } from "@/components/player/ShareSettingsModal";

export function ShareLinkBar({
  videoId,
  title,
  disabled,
}: {
  videoId: string | null;
  title: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const watchUrl = videoId ? `${baseUrl}/watch/${videoId}` : "";

  const copyLink = () => {
    if (!watchUrl) return;
    navigator.clipboard.writeText(watchUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!videoId) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        onClick={() => setShareModalOpen(true)}
        disabled={disabled}
        className="gap-1.5"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={copyLink}
        disabled={disabled}
        className="gap-1.5"
      >
        <Link2 className="h-4 w-4" />
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => setShareModalOpen(true)}
        disabled={disabled}
        title="More options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      <ShareSettingsModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        videoId={videoId}
        title={title}
      />
    </div>
  );
}
