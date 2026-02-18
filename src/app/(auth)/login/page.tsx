"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const errorParam = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    // Ensures the browser-client has persisted the session cookies before we hit server-guarded routes.
    await supabase.auth.getSession();
    setMessage({ type: "success", text: "Signed in. Redirecting..." });
    router.replace(next);
    router.refresh();
  };

  const handleOAuthLogin = async (provider: "google") => {
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Sign in to ClipCraft</CardTitle>
        <CardDescription>
          Enter your credentials or sign in with Google
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {message && (
            <p
              className={`text-sm ${message.type === "error"
                ? "text-(--destructive)"
                : "text-green-600"
                }`}
            >
              {message.text}
            </p>
          )}
          {!message && errorParam === "session_missing" && (
            <p className="text-sm text-(--muted-foreground)">
              Your session wasn&apos;t detected. Try signing in again.
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-(--border)" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-(--card) px-2 text-(--muted-foreground)">
              Or continue with
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuthLogin("google")}
          disabled={loading}
        >
          Google
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-(--muted-foreground)">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline hover:text-foreground">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
