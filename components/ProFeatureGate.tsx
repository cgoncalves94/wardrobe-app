"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lock, Sparkles } from "lucide-react";

type Props = {
  featureKey: "generate" | "tryOn";
};

export default function ProFeatureGate({ featureKey }: Props) {
  const t = useTranslations();

  const descriptionKey =
    featureKey === "generate"
      ? "pro.generateLockedDescription"
      : "pro.tryOnLockedDescription";

  return (
    <div className="rounded-xl border border-border bg-card py-16 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-secondary flex items-center justify-center">
        <Lock className="w-8 h-8 text-foreground/70" />
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-foreground text-background text-xs font-medium">
        <Sparkles className="w-3 h-3" />
        {t("pro.badge")}
      </div>
      <h2 className="text-xl font-semibold mb-3">{t("pro.featureLocked")}</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-6 px-4">
        {t(descriptionKey)}
      </p>
      <Link
        href="/upgrade"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
      >
        {t("pro.upgradeToPro")}
      </Link>
    </div>
  );
}
