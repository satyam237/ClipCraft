"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  Video,
  FolderOpen,
  Settings,
  Users,
  CreditCard,
  LayoutGrid,
  Calendar,
  ListVideo,
  CircleDot,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/dashboard", label: "Home Page", icon: CircleDot },
  { href: "/workspace", label: "Library", icon: FolderOpen },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/dashboard", label: "Recent", icon: ListVideo },
  { href: "/settings", label: "Personal settings", icon: Settings },
];

const adminNav = [
  { href: "/workspace", label: "Manage", icon: LayoutGrid },
  { href: "/workspace", label: "Users", icon: Users },
  { href: "/workspace", label: "Workspace", icon: FolderOpen },
  { href: "/pricing", label: "Billing", icon: CreditCard },
];

export function Sidebar({
  user,
  workspaceLabel = "Personal",
  memberCount = 1,
}: {
  user: User;
  workspaceLabel?: string;
  memberCount?: number;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard")
      return pathname === "/dashboard";
    if (href === "/settings") return pathname.startsWith("/settings");
    return pathname === href || (href.length > 1 && pathname.startsWith(href + "/"));
  };

  return (
    <aside className="flex w-56 flex-col border-r border-[var(--border)] bg-[var(--card)]">
      <div className="flex h-14 items-center border-b border-[var(--border)] px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Video className="h-6 w-6" />
          ClipCraft
        </Link>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-sm font-medium text-foreground">{workspaceLabel}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </p>
          <Link
            href="/workspace"
            className="mt-1 inline-block text-xs font-medium text-[var(--primary)] hover:underline"
          >
            + Invite teammates
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {mainNav.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
          <div className="pt-2">
            <p className="mb-1 flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Admin tools
              <span className="rounded bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--primary-foreground)]">
                New!
              </span>
            </p>
            {adminNav.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="border-t border-[var(--border)] p-2">
          <Button asChild className="w-full" size="lg">
            <Link href="/dashboard/record" className="flex items-center justify-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Video className="h-4 w-4" />
              </span>
              Record a video
            </Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}
