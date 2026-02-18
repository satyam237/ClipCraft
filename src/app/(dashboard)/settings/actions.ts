"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProfilePreferences = {
  default_workspace_id?: string | null;
  default_folder_id?: string | null;
  push_notifications_enabled?: boolean;
  email_digest_enabled?: boolean;
  notify_when_ready?: boolean;
  quick_record?: {
    default_camera_id?: string | null;
    default_microphone_id?: string | null;
    start_on_open?: boolean;
    shortcut?: string | null;
  };
};

export async function updateProfile(params: {
  display_name?: string | null;
  avatar_url?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: params.display_name,
      avatar_url: params.avatar_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}

export async function updatePreferences(preferences: Partial<ProfilePreferences>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const existingPrefs = (existing?.preferences as ProfilePreferences) ?? {};
  const merged: ProfilePreferences = {
    ...existingPrefs,
    ...preferences,
  };
  if (preferences.quick_record !== undefined) {
    merged.quick_record = {
      ...existingPrefs.quick_record,
      ...preferences.quick_record,
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      preferences: merged,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}
