"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LayoutDashboard, Video, FolderOpen, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workspace", label: "Workspaces", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-[var(--border)] bg-[var(--card)]">
      <div className="flex h-14 items-center border-b border-[var(--border)] px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Video className="h-6 w-6" />
          ClipCraft
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
