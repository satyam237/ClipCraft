import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Video, Sparkles, Share2, Shield } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4" style={{ background: "linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #ffffff 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg">
            <Video className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">ClipCraft</h1>
        </div>
        <p className="text-[var(--muted-foreground)] text-center max-w-md">
          Record your screen, share in seconds, and auto-polish with AI.
        </p>
        <Button asChild size="lg" className="rounded-2xl px-8 shadow-lg">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 30%, #7dd3fc 60%, #38bdf8 100%)" }}>
      <nav className="flex items-center justify-between px-6 py-4 backdrop-blur-sm bg-white/30">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-md">
            <Video className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-[#0c1929]">ClipCraft</span>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" asChild className="text-[#0c4a6e] hover:bg-white/40">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="rounded-2xl shadow-md">
            <Link href="/signup">Get started free</Link>
          </Button>
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-[#0c1929] sm:text-6xl">
            Record. Share. <span className="text-white drop-shadow-md">Shine.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-[#0c4a6e]/80">
            Professional screen recordings from your browser. Record, auto-transcribe with AI,
            and share with a single link. No installs needed.
          </p>
        </div>

        <div className="flex gap-4">
          <Button asChild size="lg" className="rounded-2xl px-10 py-6 text-base shadow-xl hover:shadow-2xl">
            <Link href="/signup">Start Recording — Free</Link>
          </Button>
          <Button variant="outline" asChild size="lg" className="rounded-2xl px-8 py-6 text-base bg-white/60 backdrop-blur-sm border-white/40 text-[#0c4a6e] hover:bg-white/80">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>

        <div className="mt-12 grid max-w-3xl gap-6 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/50 backdrop-blur-sm p-6 shadow-lg border border-white/40">
            <Sparkles className="mb-3 h-8 w-8 text-[#0ea5e9]" />
            <h3 className="font-semibold text-[#0c1929]">AI-Powered</h3>
            <p className="mt-1 text-sm text-[#0c4a6e]/70">Auto transcripts, summaries, and chapters generated instantly.</p>
          </div>
          <div className="rounded-2xl bg-white/50 backdrop-blur-sm p-6 shadow-lg border border-white/40">
            <Share2 className="mb-3 h-8 w-8 text-[#0ea5e9]" />
            <h3 className="font-semibold text-[#0c1929]">Instant Sharing</h3>
            <p className="mt-1 text-sm text-[#0c4a6e]/70">One-click shareable links with password protection and access controls.</p>
          </div>
          <div className="rounded-2xl bg-white/50 backdrop-blur-sm p-6 shadow-lg border border-white/40">
            <Shield className="mb-3 h-8 w-8 text-[#0ea5e9]" />
            <h3 className="font-semibold text-[#0c1929]">Team Ready</h3>
            <p className="mt-1 text-sm text-[#0c4a6e]/70">Workspaces, comments, reactions, and role-based access for your team.</p>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-[#0c4a6e]/60">
        &copy; {new Date().getFullYear()} ClipCraft. All rights reserved.
      </footer>
    </div>
  );
}
