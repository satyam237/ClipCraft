import type { PlanKey } from "@/lib/stripe";

export type Feature =
  | "password_protection"
  | "restricted_sharing"
  | "ai_transcription"
  | "ai_summary"
  | "ai_chapters"
  | "ai_highlights"
  | "detailed_analytics"
  | "advanced_analytics"
  | "custom_branding"
  | "priority_support";

const PLAN_LIMITS: Record<PlanKey, {
  maxVideos: number;
  maxDurationSeconds: number;
  maxStorageBytes: number;
  maxWorkspaces: number;
  maxMembersPerWorkspace: number;
  features: Set<Feature>;
}> = {
  free: {
    maxVideos: 25,
    maxDurationSeconds: 5 * 60,
    maxStorageBytes: 2 * 1024 * 1024 * 1024,
    maxWorkspaces: 1,
    maxMembersPerWorkspace: 1,
    features: new Set([]),
  },
  pro: {
    maxVideos: Infinity,
    maxDurationSeconds: 30 * 60,
    maxStorageBytes: 50 * 1024 * 1024 * 1024,
    maxWorkspaces: 3,
    maxMembersPerWorkspace: 5,
    features: new Set([
      "password_protection",
      "ai_transcription",
      "ai_summary",
      "detailed_analytics",
    ]),
  },
  business: {
    maxVideos: Infinity,
    maxDurationSeconds: Infinity,
    maxStorageBytes: Infinity,
    maxWorkspaces: Infinity,
    maxMembersPerWorkspace: Infinity,
    features: new Set([
      "password_protection",
      "restricted_sharing",
      "ai_transcription",
      "ai_summary",
      "ai_chapters",
      "ai_highlights",
      "detailed_analytics",
      "advanced_analytics",
      "custom_branding",
      "priority_support",
    ]),
  },
};

export function getPlanLimits(plan: PlanKey) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export function canUseFeature(plan: PlanKey, feature: Feature): boolean {
  return getPlanLimits(plan).features.has(feature);
}

export function getMaxDurationSeconds(plan: PlanKey): number {
  return getPlanLimits(plan).maxDurationSeconds;
}

export function getMaxVideos(plan: PlanKey): number {
  return getPlanLimits(plan).maxVideos;
}

export function formatPlanName(plan: string | null | undefined): string {
  if (!plan || plan === "free") return "Free";
  if (plan === "pro") return "Pro";
  if (plan === "business") return "Business";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export function isValidPlan(plan: string | null | undefined): plan is PlanKey {
  return plan === "free" || plan === "pro" || plan === "business";
}
