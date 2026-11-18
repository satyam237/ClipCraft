import { createClient } from "@/lib/supabase/server";
import { getWorkspaces } from "@/lib/db/workspaces";
import { SettingsTabs } from "./SettingsTabs";

const VALID_TABS = new Set([
  "account",
  "meeting-recordings",
  "notifications",
  "integrations",
  "quick-record",
  "shortcuts",
]);

type TabId =
  | "account"
  | "meeting-recordings"
  | "notifications"
  | "integrations"
  | "quick-record"
  | "shortcuts";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab: TabId = VALID_TABS.has(params.tab ?? "") ? (params.tab as TabId) : "account";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileResult, workspaces] = await Promise.all([
    user
      ? supabase
          .from("profiles")
          .select("display_name, avatar_url, plan, preferences")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? getWorkspaces(supabase as import("@/lib/db/workspaces").SupabaseClientDatabase)
      : Promise.resolve([]),
  ]);

  const profile = profileResult.data;

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
        profile={profile as import("@/types/database").Database["public"]["Tables"]["profiles"]["Row"] | null}
        preferences={(profile?.preferences as Record<string, unknown>) ?? {}}
        workspaces={workspaces}
        initialTab={initialTab}
      />
    </div>
  );
}
