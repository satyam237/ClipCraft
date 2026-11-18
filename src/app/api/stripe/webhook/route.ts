import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

async function updateProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  data: Record<string, unknown>
) {
  await supabase
    .from("profiles")
    .update(data)
    .eq("stripe_customer_id", customerId);
}

function getPlanFromPriceId(priceId: string): string {
  const proPriceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const businessPriceId = process.env.STRIPE_PRICE_BUSINESS_MONTHLY;
  if (priceId === proPriceId) return "pro";
  if (priceId === businessPriceId) return "business";
  return "free";
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.customer && session.subscription) {
        const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? getPlanFromPriceId(priceId) : "free";
        await updateProfile(supabase, session.customer as string, {
          stripe_subscription_id: session.subscription,
          subscription_status: "active",
          plan,
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? getPlanFromPriceId(priceId) : "free";
      await updateProfile(supabase, subscription.customer as string, {
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        plan,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await updateProfile(supabase, subscription.customer as string, {
        stripe_subscription_id: null,
        subscription_status: "free",
        plan: "free",
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) {
        await updateProfile(supabase, invoice.customer as string, {
          subscription_status: "past_due",
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
