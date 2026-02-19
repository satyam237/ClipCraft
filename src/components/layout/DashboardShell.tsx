"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, CreditCard, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function getInitials(email: string | undefined): string {
  if (!email) return "?";
  const part = email.split("@")[0];
  if (part.length >= 2) return part.slice(0, 2).toUpperCase();
  return part.slice(0, 1).toUpperCase();
}

export function DashboardShell({
  user,
  children,
  workspaceLabel = "Personal",
  memberCount = 1,
}: {
  user: User;
  children: React.ReactNode;
  workspaceLabel?: string;
  memberCount?: number;
}) {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const avatarUrl =
    user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        user={user}
        workspaceLabel={workspaceLabel}
        memberCount={memberCount}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-2 border-b border-(--border) px-6">
          <div className="flex-1" />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                suppressHydrationWarning
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border) bg-(--muted) text-sm font-medium text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-(--ring) focus:ring-offset-2"
                aria-label="Open user menu"
              >
                {!mounted ? (
                  <span className="invisible">?</span>
                ) : avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(user.email ?? undefined)
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex cursor-pointer items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Profile settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/pricing" className="flex cursor-pointer items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pricing / Plan
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                onSelect={(e) => {
                  e.preventDefault();
                  handleSignOut();
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
