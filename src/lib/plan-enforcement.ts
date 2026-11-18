import { getPlan, type PlanId, type PlanDefinition } from "./plans";

export interface UsageSnapshot {
  videosCreated: number;
  minutesRecorded: number;
  storageBytes: number;
}

export interface EnforcementResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

export function canCreateVideo(
  planId: PlanId | string | null,
  usage: UsageSnapshot
): EnforcementResult {
  const plan = getPlan(planId);
  if (plan.limits.videosPerMonth !== Infinity && usage.videosCreated >= plan.limits.videosPerMonth) {
    return {
      allowed: false,
      reason: `You've reached your ${plan.limits.videosPerMonth} video/month limit on the ${plan.name} plan.`,
      upgradeRequired: true,
    };
  }
  return { allowed: true };
}

export function canRecord(
  planId: PlanId | string | null,
  currentDurationMin: number
): EnforcementResult {
  const plan = getPlan(planId);
  if (
    plan.limits.maxRecordingMinutes !== Infinity &&
    currentDurationMin >= plan.limits.maxRecordingMinutes
  ) {
    return {
      allowed: false,
      reason: `Recording limit of ${plan.limits.maxRecordingMinutes} minutes reached on the ${plan.name} plan.`,
      upgradeRequired: true,
    };
  }
  return { allowed: true };
}

export function canUseShareFeature(
  planId: PlanId | string | null,
  feature: keyof PlanDefinition["shareFeatures"]
): EnforcementResult {
  const plan = getPlan(planId);
  if (!plan.shareFeatures[feature]) {
    return {
      allowed: false,
      reason: `${formatFeatureName(feature)} requires a paid plan.`,
      upgradeRequired: true,
    };
  }
  return { allowed: true };
}

function formatFeatureName(feature: string): string {
  const names: Record<string, string> = {
    password: "Password-protected links",
    inviteOnly: "Invite-only sharing",
    expiry: "Expiring links",
    maxViews: "Max view limits",
    downloadControl: "Download control",
    embedCode: "Embed code",
  };
  return names[feature] ?? feature;
}

export function getCurrentMonthYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
