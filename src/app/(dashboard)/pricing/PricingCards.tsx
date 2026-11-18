"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Sparkles, Crown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const tiers = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with screen recording and sharing.",
    icon: Sparkles,
    features: [
      { label: "25 videos", included: true },
      { label: "5 min max duration", included: true },
      { label: "2 GB storage", included: true },
      { label: "Public & unlisted links", included: true },
      { label: "Basic view count analytics", included: true },
      { label: "1 workspace", included: true },
      { label: "Password protection", included: false },
      { label: "AI transcription & summary", included: false },
      { label: "Detailed analytics", included: false },
      { label: "Custom branding", included: false },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$12",
    period: "/month",
    description: "For professionals and growing teams.",
    icon: Crown,
    popular: true,
    features: [
      { label: "Unlimited videos", included: true },
      { label: "30 min max duration", included: true },
      { label: "50 GB storage", included: true },
      { label: "Public & unlisted links", included: true },
      { label: "Password protection", included: true },
      { label: "AI transcription & summary", included: true },
      { label: "Detailed analytics", included: true },
      { label: "3 workspaces, 5 members each", included: true },
      { label: "Restricted (invite-only) sharing", included: false },
      { label: "Custom branding", included: false },
    ],
  },
  {
    key: "business",
    name: "Business",
    price: "$29",
    period: "/month",
    description: "For teams that need everything.",
    icon: Building2,
    features: [
      { label: "Unlimited videos", included: true },
      { label: "Unlimited duration", included: true },
      { label: "Unlimited storage", included: true },
      { label: "All sharing options", included: true },
      { label: "Restricted (invite-only) sharing", included: true },
      { label: "AI transcription, summary, chapters", included: true },
      { label: "Advanced analytics + export", included: true },
      { label: "Unlimited workspaces & members", included: true },
      { label: "Custom branding", included: true },
      { label: "Priority support", included: true },
    ],
  },
];

export function PricingCards({
  currentPlan,
  subscriptionStatus,
  isAuthenticated,
}: {
  currentPlan: string;
  subscriptionStatus: string | null;
  isAuthenticated: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: string) => {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <p className="text-[var(--muted-foreground)] max-w-lg mx-auto">
          Start free and upgrade as your needs grow. All plans include core recording features.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrent = currentPlan === tier.key;
          const isPopular = "popular" in tier && tier.popular;

          return (
            <Card
              key={tier.key}
              className={cn(
                "relative flex flex-col",
                isPopular && "border-[var(--primary)] shadow-lg shadow-[var(--primary)]/10 scale-[1.02]",
                isCurrent && "ring-2 ring-[var(--primary)]"
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--primary)] px-4 py-1 text-xs font-semibold text-[var(--primary-foreground)]">
                  Most Popular
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10">
                  <tier.icon className="h-6 w-6 text-[var(--primary)]" />
                </div>
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold">{tier.price}</span>
                  <span className="text-sm text-[var(--muted-foreground)]">{tier.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-2.5">
                  {tier.features.map((feat) => (
                    <li key={feat.label} className="flex items-start gap-2 text-sm">
                      {feat.included ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]/40" />
                      )}
                      <span className={cn(!feat.included && "text-[var(--muted-foreground)]/60")}>
                        {feat.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrent ? (
                  <div className="w-full space-y-2">
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                    {currentPlan !== "free" && subscriptionStatus === "active" && (
                      <Button
                        variant="ghost"
                        className="w-full text-sm"
                        onClick={handlePortal}
                        disabled={loading === "portal"}
                      >
                        {loading === "portal" ? "Loading..." : "Manage Subscription"}
                      </Button>
                    )}
                  </div>
                ) : tier.key === "free" ? (
                  currentPlan !== "free" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handlePortal}
                      disabled={loading === "portal"}
                    >
                      {loading === "portal" ? "Loading..." : "Downgrade"}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  )
                ) : (
                  <Button
                    className={cn("w-full", isPopular && "shadow-lg")}
                    onClick={() => handleCheckout(tier.key)}
                    disabled={loading === tier.key || !isAuthenticated}
                  >
                    {loading === tier.key
                      ? "Loading..."
                      : currentPlan === "free"
                        ? `Upgrade to ${tier.name}`
                        : `Switch to ${tier.name}`}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="text-center text-sm text-[var(--muted-foreground)]">
        <p>All paid plans include a 14-day free trial. Cancel anytime.</p>
        <p className="mt-1">Questions? Contact us at support@clipcraft.app</p>
      </div>
    </div>
  );
}
