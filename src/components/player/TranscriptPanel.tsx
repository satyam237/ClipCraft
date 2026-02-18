"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TranscriptPanel({
  transcript,
  isProcessing,
  onSeek,
}: {
  transcript: string | null;
  isProcessing: boolean;
  onSeek?: (time: number) => void;
}) {
  const [search, setSearch] = useState("");

  const highlighted = useMemo(() => {
    if (!transcript) return null;
    if (!search.trim()) return transcript;
    const re = new RegExp(`(${escapeRegExp(search.trim())})`, "gi");
    return transcript.replace(re, "<mark>$1</mark>");
  }, [transcript, search]);

  const copyTranscript = () => {
    if (transcript) navigator.clipboard.writeText(transcript);
  };

  if (isProcessing && !transcript) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h3 className="mb-2 font-medium">Transcript</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Generating transcript…
        </p>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h3 className="mb-2 font-medium">Transcript</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          No transcript available.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">Transcript</h3>
        <Button variant="ghost" size="icon" onClick={copyTranscript}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <div className="mb-3">
        <Label className="sr-only">Search transcript</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <div
        className="max-h-64 overflow-y-auto text-sm leading-relaxed [&_mark]:bg-yellow-200 dark:[&_mark]:bg-yellow-800"
        dangerouslySetInnerHTML={{ __html: highlighted ?? transcript }}
      />
      {onSeek && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => onSeek(0)}
        >
          Go to start
        </Button>
      )}
    </div>
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
