import type { Gender, GenderEligibility } from "@prisma/client";

/** Maternity = FEMALE, Paternity = MALE, others = ALL */
export function isLeaveTypeEligibleForGender(
  eligible: GenderEligibility,
  gender: Gender | null | undefined,
): boolean {
  if (eligible === "ALL") return true;
  if (!gender || gender === "UNSPECIFIED") return false;
  return eligible === gender;
}

export function genderEligibilityWhere(gender: Gender | null | undefined) {
  if (!gender || gender === "UNSPECIFIED") {
    return { eligibleGender: "ALL" as const };
  }
  return {
    OR: [
      { eligibleGender: "ALL" as const },
      { eligibleGender: gender },
    ],
  };
}
