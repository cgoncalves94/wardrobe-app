"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import ProFeatureGate from "@/components/ProFeatureGate";
import ItemRow from "@/components/ItemRow";
import ToggleButtonGroup from "@/components/ToggleButtonGroup";
import { toast } from "@/components/ui/sonner";
import {
  Sparkles,
  Wand2,
  X,
  Save,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Shirt,
  MessageSquare,
  LayoutGrid,
  PersonStanding,
  Venus,
  Mars,
  Plus,
  ChevronUp,
} from "lucide-react";
import { getRootIcon } from "@/lib/categories";
import Link from "next/link";
import { OUTFIT_STYLES, OutfitStyle, MannequinGender } from "@/lib/gemini/types";
import { isProRoute } from "@/lib/features";

type TabType = "fromItems" | "aiPicks";

type Item = {
  id: string;
  name: string;
  image_url: string;
  category_id: string;
  categories?: { name: string; root: string } | null;
};

export default function GenerateOutfitPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("fromItems");

  // Selected items (for "From Items" tab)
  const [selectedHeadwear, setSelectedHeadwear] = useState<Item | null>(null);
  const [selectedTop, setSelectedTop] = useState<Item | null>(null);
  const [selectedBottom, setSelectedBottom] = useState<Item | null>(null);
  const [selectedFullBody, setSelectedFullBody] = useState<Item | null>(null);
  const [selectedFootwear, setSelectedFootwear] = useState<Item | null>(null);
  const [selectedAccessories, setSelectedAccessories] = useState<Item[]>([]);

  // AI Picks state (for "AI Picks" tab)
  const [occasion, setOccasion] = useState("");
  const [style, setStyle] = useState<OutfitStyle>("casual");

  // Shared generation state
  const [useMannequin, setUseMannequin] = useState(false);
  const [mannequinGender, setMannequinGender] = useState<MannequinGender>("female");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [outfitName, setOutfitName] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const t = useTranslations();
  const { isPro, loading: subscriptionLoading } = useSubscription();

  // Close lightbox with Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewOpen(false);
    }
    if (previewOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [previewOpen]);

  // Auto-open mobile sheet when generating starts or image is ready
  useEffect(() => {
    if (generating || generatedImage) {
      setMobileSheetOpen(true);
    }
  }, [generating, generatedImage]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const { data } = await supabase
        .from("items")
        .select("id, name, image_url, category_id, categories(name, root)")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      setItems((data || []) as unknown as Item[]);
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  // Filter items by category root
  const headwearItems = items.filter((item) => item.categories?.root === "Headwear");
  const topItems = items.filter((item) => item.categories?.root === "Top");
  const bottomItems = items.filter((item) => item.categories?.root === "Bottom");
  const fullBodyItems = items.filter((item) => item.categories?.root === "Full Body");
  const footwearItems = items.filter((item) => item.categories?.root === "Footwear");
  const accessoryItems = items.filter((item) => item.categories?.root === "Accessories");

  // All selected items for the visual strip
  const allSelected = [
    selectedHeadwear,
    selectedTop,
    selectedBottom,
    selectedFullBody,
    selectedFootwear,
    ...selectedAccessories,
  ].filter(Boolean) as Item[];

  const hasSelection = allSelected.length > 0;
  const selectedCount = allSelected.length;

  const genderLabels: Record<MannequinGender, string> = {
    female: t("outfits.genders.female"),
    male: t("outfits.genders.male"),
  };

  const styleLabels: Record<string, string> = {
    casual: t("outfits.styles.casual"),
    formal: t("outfits.styles.formal"),
    "date-night": t("outfits.styles.dateNight"),
    work: t("outfits.styles.work"),
    street: t("outfits.styles.street"),
    cozy: t("outfits.styles.cozy"),
    elegant: t("outfits.styles.elegant"),
  };

  async function handleGenerate() {
    if (activeTab === "fromItems") {
      if (!hasSelection) {
        toast.error(t("outfits.selectAtLeastOne"));
        return;
      }
    } else {
      if (!occasion.trim()) {
        toast.error(t("outfits.enterOccasion"));
        return;
      }
    }

    setGenerating(true);
    setGeneratedImage(null);

    try {
      const body = {
        useMannequin,
        mannequinGender,
        ...(activeTab === "fromItems"
          ? {
              headwearItemId: selectedHeadwear?.id,
              topItemId: selectedTop?.id,
              bottomItemId: selectedBottom?.id,
              fullBodyItemId: selectedFullBody?.id,
              footwearItemId: selectedFootwear?.id,
              accessoryIds: selectedAccessories.map((a) => a.id),
            }
          : {
              occasion: occasion.trim(),
              style,
            }),
      };

      const response = await fetch("/api/ai/generate-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("outfits.failedToGenerate"));
      }

      setGeneratedImage(data.imageUrl);
      toast.success(t("outfits.outfitGenerated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("outfits.failedToGenerate");
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!generatedImage || !outfitName.trim()) {
      toast.error(t("outfits.enterOutfitName"));
      return;
    }

    if (!userId) {
      toast.error(t("outfits.mustBeLoggedInSave"));
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("outfits").insert({
        name: outfitName.trim(),
        generated_image_url: generatedImage,
        is_favorite: false,
        user_id: userId,
        type: "outfit",
      });

      if (error) throw error;

      toast.success(t("outfits.outfitSaved"));
      router.push("/outfits");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("outfits.failedToSave");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function clearAllSelections() {
    setSelectedHeadwear(null);
    setSelectedTop(null);
    setSelectedBottom(null);
    setSelectedFullBody(null);
    setSelectedFootwear(null);
    setSelectedAccessories([]);
  }

  // Loading state
  if (loading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-foreground/10 to-foreground/5 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-foreground/50 animate-pulse" />
          </div>
          <p className="text-muted-foreground text-sm">{t("outfits.loadingWardrobe")}</p>
        </div>
      </div>
    );
  }

  // Pro gate
  if (isProRoute("/outfits/generate") && !isPro) {
    return (
      <div className="pb-20 lg:pb-8">
        <div className="mb-6">
          <Link
            href="/outfits"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("outfits.title")}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{t("outfits.createOutfit")}</h1>
        </div>
        <ProFeatureGate featureKey="generate" />
      </div>
    );
  }

  // Extra padding only when mobile action bar is visible
  const showMobileActionBar = activeTab === "aiPicks" || hasSelection;

  return (
    <div className={`lg:pb-8 ${showMobileActionBar ? "pb-24" : "pb-4"}`}>
      {/* Header - Minimal */}
      <div className="mb-6">
        <Link
          href="/outfits"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("outfits.title")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("outfits.createOutfit")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {activeTab === "fromItems"
            ? t("outfits.selectItemsDescription")
            : t("outfits.aiPicksDescription")}
        </p>
      </div>

      {/* Mode Tabs */}
      <div className={`flex gap-2 mb-6 ${generating ? "opacity-50 pointer-events-none" : ""}`}>
        <button
          type="button"
          disabled={generating}
          onClick={() => {
            setActiveTab("fromItems");
            setGeneratedImage(null);
            setOutfitName("");
          }}
          className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
            activeTab === "fromItems"
              ? "bg-foreground text-background"
              : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Shirt className="w-4 h-4" />
          {t("outfits.tabs.fromItems")}
        </button>
        <button
          type="button"
          disabled={generating}
          onClick={() => {
            setActiveTab("aiPicks");
            setGeneratedImage(null);
            setOutfitName("");
          }}
          className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
            activeTab === "aiPicks"
              ? "bg-foreground text-background"
              : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {t("outfits.tabs.aiPicks")}
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column - Selection Area */}
        <div className="space-y-6 lg:border-r lg:border-foreground/10 lg:pr-8">
          {/* AI Picks Tab */}
          {activeTab === "aiPicks" && (
            <div className="space-y-6">
              {/* Occasion Input */}
              <div className="space-y-3">
                <label className="text-sm font-medium">{t("outfits.occasionLabel")}</label>
                <input
                  type="text"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder={t("outfits.occasionPlaceholder")}
                  className="w-full h-12 px-4 rounded-xl border-0 bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 text-sm"
                />
              </div>

              {/* Style Pills */}
              <div className="space-y-3">
                <label className="text-sm font-medium">{t("outfits.style")}</label>
                <div className="flex flex-wrap gap-2">
                  {OUTFIT_STYLES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStyle(s.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        style === s.value
                          ? "bg-foreground text-background"
                          : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {s.emoji} {styleLabels[s.value]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* From Items Tab */}
          {activeTab === "fromItems" && (
            <div className="space-y-5">
              {/* Selected Items Strip */}
              {hasSelection && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-foreground/[0.03] to-transparent border border-foreground/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Your Outfit ({selectedCount})
                    </span>
                    <div className="flex items-center gap-3">
                      {/* New Outfit button - mobile only when generated */}
                      {generatedImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setGeneratedImage(null);
                            setOutfitName("");
                            clearAllSelections();
                          }}
                          className="text-xs font-medium text-foreground hover:opacity-70 transition-opacity lg:hidden"
                        >
                          {t("outfits.newOutfit")}
                        </button>
                      )}
                      {/* Clear selection - hidden on mobile when generating/generated */}
                      {!generating && !generatedImage && (
                        <button
                          type="button"
                          onClick={clearAllSelections}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {t("aria.clearSelection")}
                        </button>
                      )}
                      {/* Desktop only: show clear when generated */}
                      {generatedImage && (
                        <button
                          type="button"
                          onClick={clearAllSelections}
                          className="hidden lg:block text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {t("aria.clearSelection")}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {allSelected.map((item) => (
                      <div
                        key={item.id}
                        className="relative w-14 h-14 rounded-lg overflow-hidden ring-1 ring-white/10"
                      >
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                    ))}
                    {/* Only show plus placeholder when not generated */}
                    {!generatedImage && (
                      <div className="w-14 h-14 rounded-lg border-2 border-dashed border-foreground/10 flex items-center justify-center text-muted-foreground/40">
                        <Plus className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Item Categories - Horizontal Scroll (hidden on mobile when generating/generated) */}
              <div className={`space-y-5 ${generating || generatedImage ? "hidden lg:block" : ""}`}>
                {headwearItems.length > 0 && (
                  <ItemRow
                    title={t("categories.roots.headwear")}
                    items={headwearItems}
                    selected={selectedHeadwear}
                    onSelect={setSelectedHeadwear}
                    icon={getRootIcon("Headwear")}
                    disabled={generating}
                  />
                )}

                <ItemRow
                  title={t("categories.roots.top")}
                  items={topItems}
                  selected={selectedTop}
                  onSelect={setSelectedTop}
                  icon={getRootIcon("Top")}
                  disabled={generating}
                />

                <ItemRow
                  title={t("categories.roots.bottom")}
                  items={bottomItems}
                  selected={selectedBottom}
                  onSelect={setSelectedBottom}
                  icon={getRootIcon("Bottom")}
                  disabled={generating}
                />

                {fullBodyItems.length > 0 && (
                  <ItemRow
                    title={t("categories.roots.fullBody")}
                    items={fullBodyItems}
                    selected={selectedFullBody}
                    onSelect={setSelectedFullBody}
                    icon={getRootIcon("Full Body")}
                    disabled={generating}
                  />
                )}

                {footwearItems.length > 0 && (
                  <ItemRow
                    title={t("categories.roots.footwear")}
                    items={footwearItems}
                    selected={selectedFootwear}
                    onSelect={setSelectedFootwear}
                    icon={getRootIcon("Footwear")}
                    disabled={generating}
                  />
                )}

                {accessoryItems.length > 0 && (
                  <ItemRow
                    title={t("categories.roots.accessories")}
                    items={accessoryItems}
                    icon={getRootIcon("Accessories")}
                    multiSelect
                    selectedMulti={selectedAccessories}
                    onMultiSelect={setSelectedAccessories}
                    disabled={generating}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Preview (always hidden on mobile, use bottom sheet instead) */}
        <div className="hidden lg:flex lg:flex-col lg:sticky lg:top-4">
          <div className="flex-1 min-h-[500px] relative rounded-2xl overflow-hidden bg-gradient-to-br from-secondary/80 to-secondary/40">
            {generating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-foreground/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-foreground/60 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="font-medium">{t("outfits.creatingOutfit")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("outfits.generationTime")}</p>
                </div>
              </div>
            ) : generatedImage ? (
              <>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="absolute inset-0 cursor-zoom-in"
                  aria-label={t("aria.expandPreview")}
                >
                  <Image
                    src={generatedImage}
                    alt={t("outfits.generateOutfit")}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </button>
                {/* Save overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <input
                    type="text"
                    placeholder={t("outfits.nameOutfitPlaceholder")}
                    value={outfitName}
                    onChange={(e) => setOutfitName(e.target.value)}
                    className="w-full h-10 px-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !outfitName.trim()}
                      className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {t("outfits.save")}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={generating}
                      aria-label={t("aria.regenerateOutfit")}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-6">
                {/* Decorative grid pattern */}
                <div className="absolute inset-0 opacity-[0.015] pattern-grid" />
                <div className="relative flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-foreground/[0.08] to-foreground/[0.02] flex items-center justify-center border border-foreground/[0.05]">
                    <Wand2 className="w-9 h-9 text-foreground/25" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground/50">
                      {activeTab === "fromItems"
                        ? hasSelection
                          ? t("outfits.clickGenerate")
                          : t("outfits.selectItemsToStart")
                        : occasion.trim()
                        ? t("outfits.clickGenerate")
                        : t("outfits.enterOccasionToStart")}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {t("outfits.generationTime")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Fixed Bottom Action Bar - only shows when items selected or in AI Picks mode */}
      {showMobileActionBar && (
        <div className={`fixed bottom-16 left-0 right-0 z-40 lg:hidden bg-background border-t border-foreground/[0.08] ${generating ? "pointer-events-none" : ""}`}>
          <div className={`px-4 py-3 space-y-2.5 ${generating ? "opacity-50" : ""}`}>
            {/* Options Row */}
            <div className="flex items-center gap-2">
              {/* Layout Toggle */}
              <ToggleButtonGroup
                options={[
                  { value: "flatlay" as const, label: t("outfits.layoutFlatLay"), icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                  { value: "mannequin" as const, label: t("outfits.layoutMannequin"), icon: <PersonStanding className="w-3.5 h-3.5" /> },
                ]}
                value={useMannequin ? "mannequin" : "flatlay"}
                onChange={(val) => setUseMannequin(val === "mannequin")}
                disabled={generating}
                size="sm"
                stretch={!useMannequin}
              />

              {/* Gender Toggle - Only when mannequin */}
              {useMannequin && (
                <ToggleButtonGroup
                  options={[
                    { value: "female" as const, label: genderLabels.female, icon: <Venus className="w-3.5 h-3.5" /> },
                    { value: "male" as const, label: genderLabels.male, icon: <Mars className="w-3.5 h-3.5" /> },
                  ]}
                  value={mannequinGender}
                  onChange={(val) => setMannequinGender(val as MannequinGender)}
                  disabled={generating}
                  size="sm"
                />
              )}
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || (activeTab === "fromItems" ? !hasSelection : !occasion.trim())}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-foreground text-background font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("outfits.generating")}
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  {t("outfits.generateOutfit")}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mobile: Bottom Sheet for Generated Result */}
      {(generating || generatedImage) && (
        <div
          className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
            mobileSheetOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
              mobileSheetOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => !generating && setMobileSheetOpen(false)}
          />

          {/* Sheet - positioned above main nav, always captures clicks */}
          <div
            className={`absolute bottom-16 left-0 right-0 bg-background rounded-t-3xl transition-transform duration-300 ease-out pointer-events-auto ${
              mobileSheetOpen ? "translate-y-0" : "translate-y-[calc(100%-80px)]"
            }`}
          >
            {/* Handle */}
            <button
              type="button"
              onClick={() => setMobileSheetOpen(!mobileSheetOpen)}
              className="w-full pt-3 pb-2 flex justify-center"
              aria-label={mobileSheetOpen ? t("aria.collapsePreview") : t("aria.expandPreview")}
            >
              <div className="w-10 h-1 rounded-full bg-foreground/20" />
            </button>

            {/* Preview Mini Header (visible when collapsed) - clickable to expand */}
            <button
              type="button"
              onClick={() => setMobileSheetOpen(true)}
              className={`w-full px-4 pb-3 flex items-center gap-3 transition-opacity text-left ${
                mobileSheetOpen ? "opacity-0 h-0 overflow-hidden pointer-events-none" : "opacity-100"
              }`}
            >
              {generating ? (
                <>
                  <div className="w-12 h-12 rounded-xl bg-secondary/80 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-foreground/60 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t("outfits.creatingOutfit")}</p>
                    <p className="text-xs text-muted-foreground">{t("outfits.generationTime")}</p>
                  </div>
                </>
              ) : generatedImage ? (
                <>
                  <div className="w-12 h-12 rounded-xl overflow-hidden relative">
                    <Image src={generatedImage} alt="" fill className="object-cover" sizes="48px" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t("outfits.outfitReady")}</p>
                    <p className="text-xs text-muted-foreground">{t("outfits.tapToExpand")}</p>
                  </div>
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                </>
              ) : null}
            </button>

            {/* Full Preview Content */}
            <div
              className={`transition-all duration-300 max-h-[calc(100vh-100px)] ${
                mobileSheetOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <div className="px-4 pb-8 overflow-y-auto max-h-[calc(100vh-140px)]">
                {generating ? (
                  <div className="aspect-[3/4] rounded-2xl bg-secondary/50 flex flex-col items-center justify-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-foreground/10 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-foreground/60 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-lg">{t("outfits.creatingOutfit")}</p>
                      <p className="text-sm text-muted-foreground mt-1">{t("outfits.generationTime")}</p>
                    </div>
                  </div>
                ) : generatedImage ? (
                  <div className="space-y-4">
                    {/* Image Preview */}
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="w-full aspect-[3/4] relative rounded-2xl overflow-hidden"
                    >
                      <Image
                        src={generatedImage}
                        alt={t("outfits.generateOutfit")}
                        fill
                        className="object-cover"
                        sizes="100vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs">
                        {t("outfits.tapToZoom")}
                      </div>
                    </button>

                    {/* Save Form */}
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder={t("outfits.nameOutfitPlaceholder")}
                        value={outfitName}
                        onChange={(e) => setOutfitName(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving || !outfitName.trim()}
                          className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {t("outfits.save")}
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={generating}
                          aria-label={t("aria.regenerateOutfit")}
                          className="w-12 h-12 flex items-center justify-center rounded-xl bg-secondary/80 text-foreground transition-colors active:scale-[0.98]"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGeneratedImage(null);
                            setOutfitName("");
                            setMobileSheetOpen(false);
                          }}
                          aria-label={t("outfits.newOutfit")}
                          className="w-12 h-12 flex items-center justify-center rounded-xl bg-secondary/80 text-foreground transition-colors active:scale-[0.98]"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Action Bar */}
      <div className="hidden lg:block mt-8">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/50">
          {/* Layout Mode Toggle */}
          <div className={`flex items-center gap-2 ${generating ? "opacity-50 pointer-events-none" : ""}`}>
            <ToggleButtonGroup
              options={[
                { value: "flatlay" as const, label: t("outfits.layoutFlatLay"), icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                { value: "mannequin" as const, label: t("outfits.layoutMannequin"), icon: <PersonStanding className="w-3.5 h-3.5" /> },
              ]}
              value={useMannequin ? "mannequin" : "flatlay"}
              onChange={(val) => setUseMannequin(val === "mannequin")}
              disabled={generating}
              size="md"
            />

            {/* Gender Toggle - Only when mannequin */}
            {useMannequin && (
              <ToggleButtonGroup
                options={[
                  { value: "female" as const, label: genderLabels.female, icon: <Venus className="w-3.5 h-3.5" /> },
                  { value: "male" as const, label: genderLabels.male, icon: <Mars className="w-3.5 h-3.5" /> },
                ]}
                value={mannequinGender}
                onChange={(val) => setMannequinGender(val as MannequinGender)}
                disabled={generating}
                size="sm"
              />
            )}
          </div>

          {/* Mode description */}
          <span className="text-xs text-muted-foreground">
            {useMannequin ? t("outfits.layoutMannequinDesc") : t("outfits.layoutFlatLayDesc")}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || (activeTab === "fromItems" ? !hasSelection : !occasion.trim())}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background font-medium text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("outfits.generating")}
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                {t("outfits.generateOutfit")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview Lightbox - z-[100] to be above everything including bottom nav */}
      {previewOpen && generatedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black"
          onClick={() => setPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
            aria-label={t("aria.closeDialog")}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative w-full h-full p-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={generatedImage}
              alt={t("outfits.generateOutfit")}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}
