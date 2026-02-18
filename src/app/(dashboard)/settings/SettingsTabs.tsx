"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyAccountSection } from "@/components/settings/MyAccountSection";
import { updatePreferences, type ProfilePreferences } from "./actions";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];

const TAB_IDS = [
  "account",
  "meeting-recordings",
  "notifications",
  "integrations",
  "quick-record",
  "shortcuts",
] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Record<TabId, string> = {
  account: "My account",
  "meeting-recordings": "Meeting recordings",
  notifications: "Push notifications",
  integrations: "Integrations",
  "quick-record": "Quick record",
  shortcuts: "Keyboard shortcuts",
};

function isValidTab(value: string | null): value is TabId {
  return value !== null && TAB_IDS.includes(value as TabId);
}

export function SettingsTabs({
  user,
  profile,
  preferences: initialPreferences,
  workspaces,
  initialTab,
}: {
  user: User;
  profile: ProfileRow | null;
  preferences: Record<string, unknown>;
  workspaces: WorkspaceRow[];
  initialTab: TabId;
}) {
  const prefs = initialPreferences as ProfilePreferences;
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (() => {
    const t = searchParams.get("tab");
    return isValidTab(t) ? t : initialTab;
  })();

  const setTab = (value: string) => {
    const next = value as TabId;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="mb-4 w-full justify-start overflow-x-auto border-b border-[var(--border)] bg-transparent p-0 h-auto rounded-none">
        {TAB_IDS.map((id) => (
          <TabsTrigger
            key={id}
            value={id}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--primary)] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {TAB_LABELS[id]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="account" className="mt-0">
        <MyAccountSection
          user={user}
          profile={profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, plan: profile.plan } : null}
        />
      </TabsContent>
      <TabsContent value="meeting-recordings" className="mt-0">
        <MeetingRecordingsSection
          workspaces={workspaces}
          defaultWorkspaceId={prefs.default_workspace_id ?? ""}
        />
      </TabsContent>
      <TabsContent value="notifications" className="mt-0">
        <PushNotificationsSection
          pushEnabled={prefs.push_notifications_enabled ?? false}
          emailDigest={prefs.email_digest_enabled ?? false}
          notifyWhenReady={prefs.notify_when_ready ?? true}
        />
      </TabsContent>
      <TabsContent value="integrations" className="mt-0">
        <IntegrationsSection />
      </TabsContent>
      <TabsContent value="quick-record" className="mt-0">
        <QuickRecordSection
          startOnOpen={prefs.quick_record?.start_on_open ?? false}
        />
      </TabsContent>
      <TabsContent value="shortcuts" className="mt-0">
        <KeyboardShortcutsSection />
      </TabsContent>
    </Tabs>
  );
}

function MeetingRecordingsSection({
  workspaces,
  defaultWorkspaceId,
}: {
  workspaces: WorkspaceRow[];
  defaultWorkspaceId: string;
}) {
  const handleChange = async (workspaceId: string) => {
    await updatePreferences({
      default_workspace_id: workspaceId || null,
    });
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted-foreground)]">
        Choose where to save meeting recordings by default.
      </p>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <label className="text-sm font-medium">Save meeting recordings to</label>
        <select
          className="mt-2 block w-full max-w-sm rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
          defaultValue={defaultWorkspaceId}
          onChange={(e) => handleChange(e.target.value)}
        >
          <option value="">Select workspace</option>
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PushNotificationsSection({
  pushEnabled,
  emailDigest,
  notifyWhenReady,
}: {
  pushEnabled: boolean;
  emailDigest: boolean;
  notifyWhenReady: boolean;
}) {
  const update = async (patch: Partial<ProfilePreferences>) => {
    await updatePreferences(patch);
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted-foreground)]">
        Manage how you receive notifications.
      </p>
      <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">Browser push notifications</span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded"
            defaultChecked={pushEnabled}
            onChange={(e) => update({ push_notifications_enabled: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">Email digest (weekly)</span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded"
            defaultChecked={emailDigest}
            onChange={(e) => update({ email_digest_enabled: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">Notify when recording is ready</span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded"
            defaultChecked={notifyWhenReady}
            onChange={(e) => update({ notify_when_ready: e.target.checked })}
          />
        </label>
      </div>
    </div>
  );
}

function IntegrationsSection() {
  const items = [
    { name: "Slack", description: "Share recordings to channels" },
    { name: "Google Calendar", description: "Create recordings from events" },
    { name: "Zoom", description: "Save Zoom meetings as clips" },
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted-foreground)]">
        Connect your tools to streamline recording and sharing.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{item.description}</p>
            </div>
            <button
              type="button"
              className="rounded-md border border-[var(--input)] px-3 py-1.5 text-sm font-medium opacity-75"
              disabled
            >
              Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickRecordSection({
  startOnOpen,
}: {
  startOnOpen: boolean;
}) {
  const update = async (start: boolean) => {
    await updatePreferences({
      quick_record: { start_on_open: start },
    });
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted-foreground)]">
        Set defaults for quick record (camera, microphone, and behavior).
      </p>
      <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <div>
          <label className="text-sm font-medium">Default camera</label>
          <select
            className="mt-1 block w-full max-w-sm rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="">System default</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Default microphone</label>
          <select
            className="mt-1 block w-full max-w-sm rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="">System default</option>
          </select>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded"
            defaultChecked={startOnOpen}
            onChange={(e) => update(e.target.checked)}
          />
          <span className="text-sm font-medium">Start recording when opening Quick record</span>
        </label>
      </div>
    </div>
  );
}

function KeyboardShortcutsSection() {
  const shortcuts = [
    { action: "Start / stop recording", keys: "⌘ + Shift + R" },
    { action: "Pause / resume recording", keys: "⌘ + Shift + P" },
    { action: "Open dashboard", keys: "⌘ + K" },
    { action: "Open record page", keys: "⌘ + Shift + N" },
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted-foreground)]">
        Default keyboard shortcuts for ClipCraft.
      </p>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {shortcuts.map((row) => (
              <tr key={row.action} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3">{row.action}</td>
                <td className="px-4 py-3 font-mono text-[var(--muted-foreground)]">{row.keys}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
