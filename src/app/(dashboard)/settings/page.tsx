import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <span className="text-[var(--muted-foreground)]">Email:</span>{" "}
            {user?.email ?? "—"}
          </p>
          <p className="text-sm">
            <span className="text-[var(--muted-foreground)]">Display name:</span>{" "}
            {profile?.display_name ?? "—"}
          </p>
          <p className="text-sm">
            <span className="text-[var(--muted-foreground)]">Plan:</span>{" "}
            {profile?.plan ?? "free"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
