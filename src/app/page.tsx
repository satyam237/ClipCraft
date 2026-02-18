import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[var(--background)] p-4">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          ClipCraft
        </h1>
        <p className="text-[var(--muted-foreground)] text-center max-w-md">
          Record your screen, share in seconds, and auto-polish with AI.
        </p>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-[var(--background)] p-4">
      <h1 className="text-4xl font-bold text-[var(--foreground)]">
        ClipCraft
      </h1>
      <p className="text-lg text-[var(--muted-foreground)] text-center max-w-lg">
        Record your screen, share in seconds, and auto-polish with AI.
        Professional tutorial videos from your browser.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/signup">Get started</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
