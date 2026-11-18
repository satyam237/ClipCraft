import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
  }
  return _stripe;
}

export const PLANS = {
  free: {
    name: "Free",
    priceId: null as string | null,
    price: 0,
  },
  pro: {
    name: "Pro",
    priceId: (process.env.STRIPE_PRICE_PRO_MONTHLY ?? null) as string | null,
    price: 12,
  },
  business: {
    name: "Business",
    priceId: (process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? null) as string | null,
    price: 29,
  },
};

export type PlanKey = "free" | "pro" | "business";
