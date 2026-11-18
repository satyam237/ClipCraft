export type PlanId = "free" | "pro" | "business";

export interface PlanFeature {
  label: string;
  free: boolean | string;
  pro: boolean | string;
  business: boolean | string;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price: number;
  priceLabel: string;
  description: string;
  rcProductId: string | null;
  limits: {
    videosPerMonth: number;
    maxRecordingMinutes: number;
    maxStorageGb: number;
    maxTeamMembers: number;
  };
  shareFeatures: {
    password: boolean;
    inviteOnly: boolean;
    expiry: boolean;
    maxViews: boolean;
    downloadControl: boolean;
    embedCode: boolean;
  };
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "$0",
    description: "Get started with screen recording and sharing.",
    rcProductId: null,
    limits: {
      videosPerMonth: 25,
      maxRecordingMinutes: 5,
      maxStorageGb: 2,
      maxTeamMembers: 1,
    },
    shareFeatures: {
      password: false,
      inviteOnly: false,
      expiry: false,
      maxViews: false,
      downloadControl: true,
      embedCode: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 12,
    priceLabel: "$12/mo",
    description: "For power users who need more storage and advanced sharing.",
    rcProductId: "clipcraft_pro_monthly",
    limits: {
      videosPerMonth: 200,
      maxRecordingMinutes: 60,
      maxStorageGb: 50,
      maxTeamMembers: 5,
    },
    shareFeatures: {
      password: true,
      inviteOnly: true,
      expiry: true,
      maxViews: true,
      downloadControl: true,
      embedCode: true,
    },
  },
  business: {
    id: "business",
    name: "Business",
    price: 29,
    priceLabel: "$29/mo",
    description: "For teams who need unlimited recording and full control.",
    rcProductId: "clipcraft_business_monthly",
    limits: {
      videosPerMonth: Infinity,
      maxRecordingMinutes: Infinity,
      maxStorageGb: 500,
      maxTeamMembers: 50,
    },
    shareFeatures: {
      password: true,
      inviteOnly: true,
      expiry: true,
      maxViews: true,
      downloadControl: true,
      embedCode: true,
    },
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "business"];

export const FEATURE_COMPARISON: PlanFeature[] = [
  { label: "Videos per month", free: "25", pro: "200", business: "Unlimited" },
  { label: "Max recording length", free: "5 min", pro: "60 min", business: "Unlimited" },
  { label: "Storage", free: "2 GB", pro: "50 GB", business: "500 GB" },
  { label: "Team members", free: "1", pro: "5", business: "50" },
  { label: "Password-protected links", free: false, pro: true, business: true },
  { label: "Invite-only sharing", free: false, pro: true, business: true },
  { label: "Expiring links", free: false, pro: true, business: true },
  { label: "Max view limits", free: false, pro: true, business: true },
  { label: "Download control", free: true, pro: true, business: true },
  { label: "Embed code", free: false, pro: true, business: true },
  { label: "Priority processing", free: false, pro: true, business: true },
  { label: "Custom branding", free: false, pro: false, business: true },
  { label: "Admin analytics", free: false, pro: false, business: true },
];

export function getPlan(planId: string | null | undefined): PlanDefinition {
  if (planId && planId in PLANS) return PLANS[planId as PlanId];
  return PLANS.free;
}

export function isPaidPlan(planId: string | null | undefined): boolean {
  return planId === "pro" || planId === "business";
}
