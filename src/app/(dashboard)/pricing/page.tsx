import { createClient } from "@/lib/supabase/server";
import { PricingCards } from "./PricingCards";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentPlan = "free";
  let subscriptionStatus: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, subscription_status")
      .eq("id", user.id)
      .single();

    currentPlan = profile?.plan ?? "free";
    subscriptionStatus = profile?.subscription_status ?? null;
  }

  return (
    <PricingCards
      currentPlan={currentPlan}
      subscriptionStatus={subscriptionStatus}
      isAuthenticated={!!user}
    />
  );
}
