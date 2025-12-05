"use client";

import { createClient } from "./client";
import type { SubscriptionTier } from "@/lib/features";

export interface UserSubscription {
  tier: SubscriptionTier;
  isPro: boolean;
}

/**
 * Fetch subscription status from client (use in hooks/effects)
 */
export async function fetchUserSubscription(): Promise<UserSubscription | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("tier")
    .eq("user_id", user.id)
    .single();

  if (!subscription) {
    return { tier: "free", isPro: false };
  }

  return {
    tier: subscription.tier as SubscriptionTier,
    isPro: subscription.tier === "pro",
  };
}
