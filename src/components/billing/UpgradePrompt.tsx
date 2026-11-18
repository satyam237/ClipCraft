"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function UpgradePrompt({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-4 py-3 ${className}`}
    >
      <Sparkles className="h-5 w-5 shrink-0 text-[var(--primary)]" />
      <p className="flex-1 text-sm">{message}</p>
      <Button size="sm" asChild>
        <Link href="/pricing">Upgrade</Link>
      </Button>
    </div>
  );
}
