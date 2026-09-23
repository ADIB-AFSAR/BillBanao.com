/**
 * Subscription/plan access gating. Deliberately plain, synchronous, pure
 * functions (not server actions) so they can be imported from server
 * actions, pages, AND the platform-admin code without 'use server'
 * constraints.
 */
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "SUSPENDED";

export interface AccessCheckInput {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | string | null;
}

/**
 * Whether a business's status allows normal use of the app right now.
 * - ACTIVE: always allowed.
 * - TRIALING: allowed only until trialEndsAt passes (if set at all - a
 *   TRIALING business with no trialEndsAt, e.g. legacy data, is treated as
 *   allowed so nobody is locked out by a missing field).
 * - PAST_DUE / SUSPENDED: always blocked until the admin changes it.
 */
export function isBusinessAccessActive(input: AccessCheckInput): boolean {
  if (input.subscriptionStatus === "ACTIVE") return true;
  if (input.subscriptionStatus === "TRIALING") {
    if (!input.trialEndsAt) return true;
    return new Date(input.trialEndsAt).getTime() > Date.now();
  }
  return false; // PAST_DUE, SUSPENDED
}

/** A status for display purposes that folds "trial expired" into PAST_DUE. */
export function effectiveDisplayStatus(input: AccessCheckInput): SubscriptionStatus {
  if (input.subscriptionStatus === "TRIALING" && input.trialEndsAt) {
    if (new Date(input.trialEndsAt).getTime() <= Date.now()) return "PAST_DUE";
  }
  return input.subscriptionStatus;
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Trialing",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  SUSPENDED: "Suspended",
};
