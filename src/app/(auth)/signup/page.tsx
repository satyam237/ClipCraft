"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setLoading(false);
      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }
      setMessage({
        type: "success",
        text: "Check your email for the confirmation link.",
      });
    } catch (err) {
      setLoading(false);
      setMessage({
        type: "error",
        text: "Unexpected error while signing up. Please try again.",
      });
    }
  };

  const handleOAuthSignUp = async (provider: "google") => {
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
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Enter your email and password or sign up with Google
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSignUp} className="space-y-4">
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
              minLength={6}
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
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
          onClick={() => handleOAuthSignUp("google")}
          disabled={loading}
        >
          Google
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-(--muted-foreground)">
          Already have an account?{" "}
          <Link href="/login" className="underline hover:text-foreground">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
