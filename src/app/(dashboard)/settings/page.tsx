import { createClient } from "@/lib/supabase/server";
import { getWorkspaces } from "@/lib/db/workspaces";
import { SettingsTabs } from "./SettingsTabs";

const TAB_IDS = [
  "account",
  "meeting-recordings",
  "notifications",
  "integrations",
  "quick-record",
  "shortcuts",
] as const;
type TabId = (typeof TAB_IDS)[number];

function isValidTab(value: string | null): value is TabId {
  return value !== null && TAB_IDS.includes(value as TabId);
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;
  const tabParam = params.tab ?? null;
  const initialTab: TabId = isValidTab(tabParam) ? tabParam : "account";

  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  const workspaces = user
    ? await getWorkspaces(supabase as import("@/lib/db/workspaces").SupabaseClientDatabase)
    : [];

  const displayName =
    (profile?.display_name as string | null) ??
    user?.email?.split("@")[0] ??
    "User";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--muted-foreground)]">{displayName}</p>
        <h1 className="text-2xl font-semibold">Personal Settings</h1>
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
        <span className="font-medium text-foreground">Your profile</span> is managed by ClipCraft.
        Edit your name and photo in the My account tab below.
      </div>
      <SettingsTabs
        user={user!}
        profile={profile}
        preferences={(profile?.preferences as Record<string, unknown>) ?? {}}
        workspaces={workspaces}
        initialTab={initialTab}
      />
    </div>
  );
}
