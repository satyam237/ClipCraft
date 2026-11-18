"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { WatchPageClient } from "./WatchPageClient";

async function hashPassword(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function PasswordGate({
  videoId,
  title,
  passwordHash,
  videoUrl,
  duration,
  captionUrl,
  transcriptText,
  allowDownload,
}: {
  videoId: string;
  title: string;
  passwordHash: string;
  videoUrl: string | null;
  duration: number | null;
  captionUrl: string | null;
  transcriptText: string | null;
  allowDownload: boolean;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(false);
    const hash = await hashPassword(password);
    if (hash === passwordHash) {
      setUnlocked(true);
    } else {
      setError(true);
    }
    setChecking(false);
  };

  if (unlocked && videoUrl) {
    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, var(--gradient-from) 0%, var(--gradient-via) 50%, var(--gradient-to) 100%)" }}>
        <div className="mx-auto max-w-4xl px-4 py-6">
          <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
          <WatchPageClient
            videoUrl={videoUrl}
            videoId={videoId}
            title={title}
            duration={duration}
            captionUrl={captionUrl}
            transcriptText={transcriptText}
            isProcessing={false}
            allowDownload={allowDownload}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "linear-gradient(135deg, var(--gradient-from) 0%, var(--gradient-via) 50%, var(--gradient-to) 100%)" }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10">
            <Lock className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>This video is password protected. Enter the password to watch.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
              />
              {error && (
                <p className="text-sm text-[var(--destructive)]">Incorrect password. Please try again.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={checking || !password}>
              {checking ? "Checking..." : "Watch Video"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
