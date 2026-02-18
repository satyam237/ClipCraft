"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  LayoutDashboard,
  Video,
  FolderOpen,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DashboardShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-[var(--background)]">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b border-[var(--border)] px-6">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--muted-foreground)]">
              {user.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
