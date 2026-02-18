import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Clock } from "lucide-react";
import type { VideoStatus } from "@/types/database";

type VideoRow = {
  id: string;
  title: string;
  status: VideoStatus;
  duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  workspace_id: string;
};

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export function DashboardVideoGrid({ videos }: { videos: VideoRow[] }) {
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-12 text-center">
        <Video className="mb-2 h-12 w-12 text-[var(--muted-foreground)]" />
        <p className="text-[var(--muted-foreground)]">No videos yet</p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Start a new recording to see your videos here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((v) => (
        <Link key={v.id} href={`/videos/${v.id}`}>
          <Card className="overflow-hidden transition-colors hover:bg-[var(--accent)]/50">
            <div className="relative aspect-video bg-[var(--muted)]">
              {v.thumbnail_url ? (
                <Image
                  src={v.thumbnail_url}
                  alt={v.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Video className="h-12 w-12 text-[var(--muted-foreground)]" />
                </div>
              )}
              <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                {formatDuration(v.duration)}
              </div>
              {v.status !== "ready" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="rounded bg-[var(--background)] px-2 py-1 text-xs font-medium capitalize">
                    {v.status}
                  </span>
                </div>
              )}
            </div>
            <CardContent className="p-3">
              <p className="truncate font-medium">{v.title}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {formatDate(v.created_at)}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
