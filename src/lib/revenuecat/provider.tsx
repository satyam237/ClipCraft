"use client";

import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from "react";
import { Purchases } from "@revenuecat/purchases-js";
import { createClient } from "@/lib/supabase/client";
import type { PlanId } from "@/lib/plans";

interface RevenueCatContextValue {
  ready: boolean;
  currentPlan: PlanId;
  loading: boolean;
  purchase: (rcProductId: string) => Promise<void>;
  refreshEntitlements: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextValue>({
  ready: false,
  currentPlan: "free",
  loading: true,
  purchase: async () => {},
  refreshEntitlements: async () => {},
});

export function useRevenueCat() {
  return useContext(RevenueCatContext);
}

const RC_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY ?? "";

function mapEntitlementToPlan(customerInfo: {
  entitlements: { active: Record<string, unknown> };
}): PlanId {
  const active = customerInfo.entitlements.active;
  if ("business" in active) return "business";
  if ("pro" in active) return "pro";
  return "free";
}

export function RevenueCatProvider({
  userId,
  initialPlan,
  children,
}: {
  userId: string;
  initialPlan?: PlanId;
  children: ReactNode;
}) {
  const configured = useRef(false);
  const [ready] = useState(() => {
    if (!RC_API_KEY || !userId) return false;
    if (!configured.current) {
      try {
        Purchases.configure(RC_API_KEY, userId);
        configured.current = true;
        return true;
      } catch {
        return false;
      }
    }
    return configured.current;
  });
  const [currentPlan, setCurrentPlan] = useState<PlanId>(initialPlan ?? "free");
  const [loading, setLoading] = useState(!ready ? false : true);

  const refreshEntitlements = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    try {
      const info = await Purchases.getSharedInstance().getCustomerInfo();
      const plan = mapEntitlementToPlan(info);
      setCurrentPlan(plan);

      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({ plan })
        .eq("id", userId);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [ready, userId]);

  const startedSync = useRef(false);
  if (ready && !startedSync.current) {
    startedSync.current = true;
    refreshEntitlements();
  }

  const purchase = useCallback(
    async (rcProductId: string) => {
      if (!ready) return;
      const purchases = Purchases.getSharedInstance();
      const offerings = await purchases.getOfferings();
      const allPackages = Object.values(offerings.all).flatMap(
        (o) => o.availablePackages
      );
      const pkg = allPackages.find(
        (p) => p.rcBillingProduct?.identifier === rcProductId
      );
      if (!pkg) throw new Error(`Product ${rcProductId} not found in offerings`);

      await purchases.purchase({ rcPackage: pkg });
      await refreshEntitlements();
    },
    [ready, refreshEntitlements]
  );

  return (
    <RevenueCatContext.Provider
      value={{ ready, currentPlan, loading, purchase, refreshEntitlements }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}
