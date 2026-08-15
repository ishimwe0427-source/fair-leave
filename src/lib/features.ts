import { Role } from "@prisma/client";
import { DEFAULT_FEATURES, getSystemSettings, type FeatureFlags } from "@/lib/system";

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const settings = await getSystemSettings();
  return {
    ...DEFAULT_FEATURES,
    ...((settings.featureFlags as FeatureFlags) || {}),
  };
}

export async function assertFeature(
  flag: keyof FeatureFlags,
  role?: Role,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const flags = await getFeatureFlags();
  if (flags[flag] === false) {
    // Managers/admins can still request leave even if employee self-request is off
    if (
      flag === "allowEmployeeSelfRequest" &&
      role &&
      role !== "EMPLOYEE"
    ) {
      return { ok: true };
    }
    return { ok: false, error: "This feature is disabled for this company." };
  }
  return { ok: true };
}
