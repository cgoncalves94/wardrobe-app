"use client";

import { useState, useEffect } from "react";
import {
  fetchUserSubscription,
  type UserSubscription,
} from "@/lib/supabase/subscription.client";

export function useSubscription() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubscription() {
      try {
        const sub = await fetchUserSubscription();
        setSubscription(sub);
      } catch (error) {
        console.error("Failed to load subscription:", error);
        setSubscription({ tier: "free", isPro: false });
      } finally {
        setLoading(false);
      }
    }
    loadSubscription();
  }, []);

  return {
    subscription,
    loading,
    isPro: subscription?.isPro ?? false,
    tier: subscription?.tier ?? "free",
  };
}
