import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function mapEventToPlan(entitlementIds: string[]): string {
  if (entitlementIds.includes("business")) return "business";
  if (entitlementIds.includes("pro")) return "pro";
  return "free";
}

export async function POST(request: Request) {
  if (WEBHOOK_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await request.json();
  const event = body?.event;
  if (!event) {
    return NextResponse.json({ error: "No event" }, { status: 400 });
  }

  const appUserId: string | undefined = event.app_user_id;
  const eventType: string | undefined = event.type;
  const entitlementIds: string[] = event.entitlement_ids ?? [];

  if (!appUserId || !eventType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const plan = mapEventToPlan(entitlementIds);
  const subscriptionStatus =
    eventType === "EXPIRATION" || eventType === "CANCELLATION"
      ? "cancelled"
      : "active";

  const expiresAt =
    event.expiration_at_ms != null
      ? new Date(event.expiration_at_ms).toISOString()
      : null;

  const productId: string | undefined = event.product_id;

  await supabase
    .from("profiles")
    .update({
      plan: subscriptionStatus === "cancelled" ? "free" : plan,
      subscription_status: subscriptionStatus,
      subscription_product_id: productId ?? null,
      subscription_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appUserId);

  return NextResponse.json({ status: "ok" });
}
