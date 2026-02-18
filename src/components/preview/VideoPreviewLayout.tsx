"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronDown } from "lucide-react";
import { UploadStatusBadge } from "./UploadStatusBadge";
import { ShareLinkBar } from "./ShareLinkBar";
import { SummarySection } from "./SummarySection";
import { ChaptersSection } from "./ChaptersSection";
import { ReactionBar } from "@/components/comments/ReactionBar";
import { CommentList } from "@/components/comments/CommentList";
import type { UploadStatus, CreatingPhase } from "@/hooks/useBackgroundUpload";
import type { UploadProgress } from "@/lib/upload/chunked-upload";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function VideoPreviewLayout({
  videoUrl,
  title,
  onTitleChange,
  videoId,
  uploadStatus,
  uploadProgress,
  uploadProgressInfo,
  uploadError,
  creatingPhase = null,
  onRetry,
  ownerName,
  initialSummary = "",
  onDelete,
}: {
  videoUrl: string;
  title: string;
  onTitleChange: (title: string) => void;
  videoId: string | null;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  uploadProgressInfo: UploadProgress | null;
  uploadError: string | null;
  creatingPhase?: CreatingPhase;
  onRetry?: () => void;
  ownerName: string;
  initialSummary?: string;
  onDelete: () => void;
}) {
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  const handleSeek = (ms: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = ms / 1000;
    }
    setCurrentTimeMs(ms);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  const scrollToComments = () => {
    commentsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Video player */}
      <div className="space-y-2">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            className="h-full w-full"
            src={videoUrl}
            controls
            playsInline
            onTimeUpdate={(e) =>
              setCurrentTimeMs(Math.round((e.currentTarget.currentTime * 1000)))
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSpeedMenu((v) => !v)}
            >
              {speed}x
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            {showSpeedMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSpeedMenu(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 rounded-md border border-(--border) bg-(--card) p-1 shadow-md">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-(--accent)"
                      onClick={() => {
                        setSpeed(s);
                        setShowSpeedMenu(false);
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Title row + Share + Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full border-0 bg-transparent text-xl font-semibold text-foreground outline-none placeholder:text-(--muted-foreground) focus:ring-0"
            placeholder="Add a title…"
          />
          <p className="text-sm text-(--muted-foreground)">
            {ownerName} · just now
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <UploadStatusBadge
            status={uploadStatus}
            progress={uploadProgress}
            progressInfo={uploadProgressInfo}
            creatingPhase={creatingPhase}
          />
          <ShareLinkBar
            videoId={videoId}
            title={title}
            disabled={uploadStatus === "error"}
          />
        </div>
      </div>

      {uploadError && (
        <div className="flex flex-col gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          <span>{uploadError}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="w-fit">
              Retry save
            </Button>
          )}
        </div>
      )}

      {/* Reactions + Comment button */}
      <div className="flex flex-wrap items-center gap-3">
        {videoId ? (
          <ReactionBar videoId={videoId} />
        ) : (uploadStatus === "creating" || uploadStatus === "uploading") ? (
          <p className="text-sm text-(--muted-foreground)">
            Reactions and comments will appear once the video is saved.
          </p>
        ) : null}
        <Button variant="outline" size="sm" onClick={scrollToComments}>
          <MessageSquare className="mr-1.5 h-4 w-4" />
          Comment
        </Button>
      </div>

      {/* Summary */}
      <SummarySection
        videoId={videoId}
        initialSummary={initialSummary}
        disabled={uploadStatus === "error"}
      />

      {/* Chapters */}
      <ChaptersSection />

      {/* Tags placeholder - Loom style */}
      <div>
        <button
          type="button"
          className="text-sm text-(--muted-foreground) hover:text-foreground"
        >
          # add tag
        </button>
      </div>

      {/* Comments */}
      <div ref={commentsSectionRef} className="scroll-mt-4">
        {videoId ? (
          <CommentList
            videoId={videoId}
            currentTimeMs={currentTimeMs}
            onSeek={handleSeek}
          />
        ) : (
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
            </h3>
            <p className="text-sm text-(--muted-foreground)">
              Comments will be available once the video is saved.
            </p>
          </div>
        )}
      </div>

      {/* Delete / Cancel */}
      <div className="flex justify-between border-t border-(--border) pt-6">
        <Button variant="outline" onClick={onDelete}>
          Delete & re-record
        </Button>
        <Button variant="ghost" asChild>
          <a href="/dashboard">Back to dashboard</a>
        </Button>
      </div>
    </div>
  );
}
