import { createClient } from "./server";
import type { SubscriptionTier } from "@/lib/features";

export interface UserSubscription {
  tier: SubscriptionTier;
  isPro: boolean;
  stripeCustomerId: string | null;
  currentPeriodEnd: Date | null;
}

/**
 * Get the current user's subscription status (Server-side)
 * Returns null if user is not authenticated
 */
export async function getUserSubscription(): Promise<UserSubscription | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("tier, stripe_customer_id, current_period_end")
    .eq("user_id", user.id)
    .single();

  if (!subscription) {
    // Fallback to free if no subscription found (shouldn't happen with trigger)
    return {
      tier: "free",
      isPro: false,
      stripeCustomerId: null,
      currentPeriodEnd: null,
    };
  }

  return {
    tier: subscription.tier as SubscriptionTier,
    isPro: subscription.tier === "pro",
    stripeCustomerId: subscription.stripe_customer_id,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : null,
  };
}

/**
 * Check if user has pro access (Server-side convenience function)
 */
export async function isProUser(): Promise<boolean> {
  const subscription = await getUserSubscription();
  return subscription?.isPro ?? false;
}
