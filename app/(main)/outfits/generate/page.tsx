/**
 * Outfit generation page with two modes: From Items (compose from wardrobe) and AI Picks (text-to-image)
 */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { useItemsByCategory } from "@/hooks/use-items-by-category";
import ProFeatureGate from "@/components/ProFeatureGate";
import ItemRow from "@/components/ItemRow";
import SelectionStrip from "@/components/SelectionStrip";
import EmptyState from "@/components/EmptyState";
import ToggleButtonGroup from "@/components/ToggleButtonGroup";
import LoadingState from "@/components/LoadingState";
import ImageLightbox from "@/components/ImageLightbox";
import type { Item, OutfitFolder } from "@/types";
import { toast } from "@/components/ui/sonner";
import FolderDropdown from "@/components/FolderDropdown";
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
  Heart,
  Briefcase,
  Flame,
  Coffee,
  Gem,
  Dumbbell,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { getRootIcon } from "@/lib/categories";
import Link from "next/link";
import { OUTFIT_STYLES, OutfitStyle, MannequinGender } from "@/lib/gemini/types";
import { isProRoute } from "@/lib/features";

type TabType = "fromItems" | "aiPicks";

const STYLE_ICONS: Record<OutfitStyle, LucideIcon> = {
  casual: Shirt,
  formal: Briefcase,
  "date-night": Heart,
  work: Briefcase,
  street: Flame,
  cozy: Coffee,
  elegant: Gem,
  sporty: Dumbbell,
};

// Prompt suggestions for AI Picks tab
const PROMPT_SUGGESTIONS: { promptKey: string; style: OutfitStyle }[] = [
  { promptKey: "beachVacation", style: "casual" },
  { promptKey: "jobInterview", style: "formal" },
  { promptKey: "coffeeDate", style: "date-night" },
  { promptKey: "weekendBrunch", style: "elegant" },
  { promptKey: "gymSession", style: "sporty" },
  { promptKey: "movieNight", style: "cozy" },
  { promptKey: "streetStyle", style: "street" },
  { promptKey: "officeDay", style: "work" },
];

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
  const [itemsDescription, setItemsDescription] = useState("");
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

  // Folder state
  const [folders, setFolders] = useState<OutfitFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const t = useTranslations();
  const { isPro, loading: subscriptionLoading } = useSubscription();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewOpen(false);
    }
    if (previewOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [previewOpen]);

  // Lock body scroll when mobile result modal is open
  useEffect(() => {
    const isMobile = window.innerWidth < 1280; // xl breakpoint
    if (isMobile && generatedImage && !generating) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [generatedImage, generating]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Fetch items and folders in parallel
      const [itemsResult, foldersResult] = await Promise.all([
        supabase
          .from("items")
          .select("id, name, image_url, category_id, categories(name, root)")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("outfit_folders")
          .select("*")
          .eq("user_id", user?.id)
          .order("name"),
      ]);

      setItems((itemsResult.data || []) as unknown as Item[]);
      setFolders((foldersResult.data || []) as OutfitFolder[]);
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  // Filter items by category root
  const {
    headwear: headwearItems,
    top: topItems,
    bottom: bottomItems,
    fullBody: fullBodyItems,
    footwear: footwearItems,
    accessories: accessoryItems,
  } = useItemsByCategory(items);

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

  // Lock inputs when image is generated (only action buttons remain active)
  const isLocked = !!generatedImage || generating;
  const actionBarDimmed = isLocked;
  const actionControlsLocked = generating;

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
    sporty: t("outfits.styles.sporty"),
  };

  const renderMobileActionBar = () => {
    if (!showMobileActionBar) return null;

    return (
      <div className="mt-4 xl:hidden mb-20 lg:mb-0 p-4 rounded-2xl bg-secondary/30 border border-foreground/[0.04]">
        {/* Single row on sm+, stacked on small phones */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* On small phones: both toggles in one row. On sm+: just layout toggle */}
          <div className="flex items-center justify-between gap-2 sm:contents">
            {/* Layout Toggle */}
            <div className="sm:flex-shrink-0">
              <ToggleButtonGroup
                options={[
                  { value: "flatlay" as const, label: t("outfits.layoutFlatLay"), icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                  { value: "mannequin" as const, label: t("outfits.layoutMannequin"), icon: <PersonStanding className="w-3.5 h-3.5" /> },
                ]}
                value={useMannequin ? "mannequin" : "flatlay"}
                onChange={(val) => setUseMannequin(val === "mannequin")}
                size="sm"
              />
            </div>

            {/* Description - shown on md+ (between toggles) */}
            <span className="hidden md:block flex-1 min-w-0 text-xs text-muted-foreground truncate">
              {useMannequin ? t("outfits.layoutMannequinDesc") : t("outfits.layoutFlatLayDesc")}
            </span>
            {/* Spacer when description hidden */}
            <div className="hidden sm:block md:hidden flex-1 min-w-0" />

            {/* Gender Toggle */}
            <div className="sm:flex-shrink-0">
              <ToggleButtonGroup
                options={[
                  { value: "female" as const, label: genderLabels.female, icon: <Venus className="w-3.5 h-3.5" /> },
                  { value: "male" as const, label: genderLabels.male, icon: <Mars className="w-3.5 h-3.5" /> },
                ]}
                value={mannequinGender}
                onChange={(val) => setMannequinGender(val as MannequinGender)}
                size="sm"
                compactOnMobile
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={activeTab === "fromItems" ? !hasSelection : !itemsDescription.trim()}
            className="flex items-center justify-center gap-2 h-12 sm:h-auto sm:px-4 sm:py-2 rounded-xl sm:rounded-lg bg-foreground text-background font-medium text-sm disabled:opacity-40 transition-all active:scale-[0.98] sm:flex-shrink-0"
          >
            <Wand2 className="w-4 h-4" />
            {t("outfits.generateOutfit")}
          </button>
        </div>
      </div>
    );
  };

  async function handleGenerate() {
    if (activeTab === "fromItems") {
      if (!hasSelection) {
        toast.error(t("outfits.selectAtLeastOne"));
        return;
      }
    } else {
      if (!itemsDescription.trim()) {
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
              itemsDescription: itemsDescription.trim(),
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
        folder_id: selectedFolderId,
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
    return <LoadingState message={t("outfits.loadingWardrobe")} />;
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

  const showMobileActionBar = !generating;

  return (
    <div className="pb-4 lg:pb-8">
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
        <p className="text-muted-foreground mt-1">
          {activeTab === "fromItems"
            ? t("outfits.selectItemsDescription")
            : t("outfits.aiPicksDescription")}
        </p>
      </div>

      {/* Mode Tabs */}
      <div className={`flex gap-2 mb-6 ${isLocked ? "opacity-50 pointer-events-none" : ""}`}>
        <button
          type="button"
          disabled={isLocked}
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
          disabled={isLocked}
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6">
        {/* Selection Area - grid stacking renders both tabs, shows one, height = max of both */}
        <div className="grid min-w-0">
          {/* AI Picks Tab - always rendered, opacity controlled for instant switch */}
          <div className={`[grid-area:1/1] min-w-0 transition-opacity duration-0 ${activeTab !== "aiPicks" ? "opacity-0 pointer-events-none max-h-0 overflow-hidden xl:max-h-none xl:overflow-visible" : "opacity-100"}`}>
            <div className="flex flex-col gap-4 xl:h-full">
              {/* Description Input */}
              <div className="p-5 rounded-2xl bg-secondary/30 border border-foreground/[0.04]">
                <div className="flex items-center gap-2.5 mb-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("outfits.itemsDescriptionLabel")}
                  </span>
                </div>
                <textarea
                  value={itemsDescription}
                  onChange={(e) => setItemsDescription(e.target.value)}
                  placeholder={t("outfits.itemsDescriptionPlaceholder")}
                  rows={4}
                  disabled={isLocked}
                  className="w-full px-4 py-3 rounded-xl border-0 bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 text-sm resize-none disabled:opacity-50"
                />
              </div>

              {/* Style Selection */}
              <div className="p-5 rounded-2xl bg-secondary/30 border border-foreground/[0.04]">
                <div className="flex items-center gap-2.5 mb-3">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("outfits.style")}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {OUTFIT_STYLES.map((s) => {
                    const StyleIcon = STYLE_ICONS[s.value];
                    const isSelected = style === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStyle(s.value)}
                        disabled={isLocked}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                          isSelected
                            ? "bg-foreground text-background"
                            : "bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background/80"
                        }`}
                      >
                        <StyleIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{styleLabels[s.value]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Try These - Inline prompt suggestions (hidden on mobile to save space) */}
              <div className="hidden sm:flex sm:flex-col flex-1 p-5 rounded-2xl bg-secondary/30 border border-foreground/[0.04]">
                <div className="flex items-center gap-2.5 mb-3">
                  <Lightbulb className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("outfits.tryThese")}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 auto-rows-fr">
                  {PROMPT_SUGGESTIONS.map(({ promptKey, style: suggestionStyle }) => {
                    const Icon = STYLE_ICONS[suggestionStyle];
                    const prompt = t(`outfits.prompts.${promptKey}`);
                    return (
                      <button
                        key={promptKey}
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          setItemsDescription(prompt);
                          setStyle(suggestionStyle);
                        }}
                        className="p-3.5 rounded-xl bg-background/40 border border-foreground/[0.04] text-left hover:bg-background/60 hover:border-foreground/10 transition-all group disabled:opacity-50"
                      >
                        <p className="text-sm text-foreground/70 group-hover:text-foreground line-clamp-2">
                          {prompt}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                          <Icon className="w-3 h-3" />
                          {styleLabels[suggestionStyle]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Action Bar (inline for AI Picks) */}
              {renderMobileActionBar()}
            </div>
          </div>

          {/* From Items Tab - always rendered, opacity controlled for instant switch */}
          <div className={`[grid-area:1/1] min-w-0 transition-opacity duration-0 ${activeTab !== "fromItems" ? "opacity-0 pointer-events-none max-h-0 overflow-hidden xl:max-h-none xl:overflow-visible" : "opacity-100"}`}>
            <div className={activeTab === "fromItems" && (generating || generatedImage) ? "hidden xl:block" : ""}>
              {/* Empty state when no items in wardrobe */}
              {items.length === 0 ? (
                <div className="p-5 rounded-2xl bg-secondary/30 border-2 border-dashed border-foreground/[0.08]">
                  <EmptyState
                    icon={<Shirt className="w-8 h-8 text-muted-foreground/40" />}
                    title={t("outfits.noItemsInWardrobe")}
                    description={t("outfits.addItemsFirst")}
                    action={{
                      label: t("outfits.goToWardrobe"),
                      href: "/items/new",
                      icon: <Plus className="w-4 h-4" />,
                    }}
                    size="lg"
                  />
                </div>
              ) : (
              /* Item Categories - wrapped in container to match AI Picks style */
              <div className="p-5 rounded-2xl bg-secondary/30 border border-foreground/[0.04]">
                <div className="space-y-5">
                  {headwearItems.length > 0 && (
                    <ItemRow
                      title={t("categories.roots.headwear")}
                      items={headwearItems}
                      selected={selectedHeadwear}
                      onSelect={setSelectedHeadwear}
                      icon={getRootIcon("Headwear")}
                      disabled={isLocked}
                    />
                  )}

                  <ItemRow
                    title={t("categories.roots.top")}
                    items={topItems}
                    selected={selectedTop}
                    onSelect={(item) => {
                      // Full-body outfits exclude separate tops; selecting a top clears any full-body piece.
                      setSelectedFullBody(null);
                      setSelectedTop(item);
                    }}
                    icon={getRootIcon("Top")}
                    disabled={isLocked}
                  />

                  <ItemRow
                    title={t("categories.roots.bottom")}
                    items={bottomItems}
                    selected={selectedBottom}
                    onSelect={(item) => {
                      // Full-body outfits exclude separate bottoms; selecting a bottom clears any full-body piece.
                      setSelectedFullBody(null);
                      setSelectedBottom(item);
                    }}
                    icon={getRootIcon("Bottom")}
                    disabled={isLocked}
                  />

                  {fullBodyItems.length > 0 && (
                    <ItemRow
                      title={t("categories.roots.fullBody")}
                      items={fullBodyItems}
                      selected={selectedFullBody}
                      onSelect={(item) => {
                        setSelectedFullBody(item);
                        if (item) {
                          setSelectedTop(null);
                          setSelectedBottom(null);
                        }
                      }}
                      icon={getRootIcon("Full Body")}
                      disabled={isLocked}
                    />
                  )}

                  {footwearItems.length > 0 && (
                    <ItemRow
                      title={t("categories.roots.footwear")}
                      items={footwearItems}
                      selected={selectedFootwear}
                      onSelect={setSelectedFootwear}
                      icon={getRootIcon("Footwear")}
                      disabled={isLocked}
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
                      disabled={isLocked}
                    />
                  )}
                </div>
              </div>
              )}
              {/* Mobile Action Bar (inline for From Items) - only show when items exist */}
              {items.length > 0 && renderMobileActionBar()}
            </div>
          </div>
        </div>

        {/* Right Column - Preview + Action Bar (always visible on desktop) */}
        <div className="hidden xl:flex xl:flex-col xl:gap-4 min-h-0">
          {/* Preview Panel */}
          <div className="flex-1 p-5 rounded-2xl bg-secondary/30 border border-foreground/[0.04] flex flex-col min-h-[280px]">
            {/* Preview Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <Wand2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("outfits.preview")}
              </span>
            </div>
            {/* Preview Area */}
            <div className="flex-1 relative rounded-xl overflow-hidden bg-background/40">
              {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-foreground/10 to-foreground/5 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-foreground/70 animate-pulse" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl border-2 border-foreground/10 border-t-foreground/30 animate-spin [animation-duration:2s]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t("outfits.creatingOutfit")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("outfits.generationTime")}</p>
                  </div>
                </div>
              ) : generatedImage ? (
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
                  {/* Gradient overlay for save controls */}
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                </button>
              ) : (
                <div className="absolute inset-0 flex flex-col">
                  {/* Fixed selection strip at top - only for fromItems when items selected */}
                  {activeTab === "fromItems" && hasSelection && (
                    <SelectionStrip
                      label={t("outfits.selected", { count: selectedCount })}
                      items={allSelected.map((item) => ({
                        id: item.id,
                        name: item.name,
                        image_url: item.image_url!,
                      }))}
                      onClear={clearAllSelections}
                      clearLabel={t("aria.clearSelection")}
                    />
                  )}
                  {/* Center placeholder */}
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-foreground/5 border border-border/30 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center px-4">
                      {activeTab === "fromItems"
                        ? (hasSelection ? t("outfits.clickGenerate") : t("outfits.selectItemsToStart"))
                        : t("outfits.enterItemsDescriptionToStart")}
                    </p>
                  </div>
                </div>
              )}

              {/* Save Controls - Overlaid on image when result exists */}
              {generatedImage && !generating && (
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      type="text"
                      placeholder={t("outfits.nameOutfitPlaceholder")}
                      value={outfitName}
                      onChange={(e) => setOutfitName(e.target.value)}
                      className="flex-1 min-w-[120px] h-11 px-4 rounded-xl bg-black/60 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                    />
                    <FolderDropdown
                      folders={folders}
                      selectedId={selectedFolderId}
                      onSelect={setSelectedFolderId}
                      placeholder={t("folders.selectFolder")}
                      variant="lightbox"
                      showClearOption={true}
                      clearLabel={t("folders.noFolder")}
                    />
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !outfitName.trim()}
                      className="flex-shrink-0 h-11 px-4 flex items-center justify-center gap-2 rounded-xl bg-white text-black font-medium text-sm disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {t("outfits.save")}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={generating}
                      aria-label={t("aria.regenerateOutfit")}
                      className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-black/70 transition-colors active:scale-[0.98]"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Action Bar - inside right column for consistent position */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-foreground/[0.04]">
              {/* Layout Toggle */}
              <div className={`flex-shrink-0 ${actionBarDimmed ? "opacity-60" : ""} ${actionControlsLocked ? "pointer-events-none" : ""}`}>
                <ToggleButtonGroup
                  options={[
                    { value: "flatlay" as const, label: t("outfits.layoutFlatLay"), icon: <LayoutGrid className="w-4 h-4" /> },
                    { value: "mannequin" as const, label: t("outfits.layoutMannequin"), icon: <PersonStanding className="w-4 h-4" /> },
                  ]}
                  value={useMannequin ? "mannequin" : "flatlay"}
                  onChange={(val) => setUseMannequin(val === "mannequin")}
                  disabled={isLocked}
                  size="sm"
                />
              </div>

              {/* Description (show when space available) */}
              <span className="hidden 2xl:block flex-1 min-w-0 text-sm text-muted-foreground truncate">
                {useMannequin ? t("outfits.layoutMannequinDesc") : t("outfits.layoutFlatLayDesc")}
              </span>
              {/* Spacer when description is hidden */}
              <div className="flex-1 min-w-0 2xl:hidden" />

              {/* Gender Toggle */}
              <div className={`flex-shrink-0 ${actionBarDimmed ? "opacity-60" : ""} ${actionControlsLocked ? "pointer-events-none" : ""}`}>
                <ToggleButtonGroup
                  options={[
                    { value: "female" as const, label: genderLabels.female, icon: <Venus className="w-4 h-4" /> },
                    { value: "male" as const, label: genderLabels.male, icon: <Mars className="w-4 h-4" /> },
                  ]}
                  value={mannequinGender}
                  onChange={(val) => setMannequinGender(val as MannequinGender)}
                  disabled={isLocked}
                  size="sm"
                />
              </div>

              {/* Generate / New Outfit Button */}
              {generatedImage ? (
                <button
                  type="button"
                  onClick={() => {
                    setGeneratedImage(null);
                    setOutfitName("");
                    if (activeTab === "fromItems") {
                      clearAllSelections();
                    } else {
                      setItemsDescription("");
                    }
                  }}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  {t("outfits.newOutfit")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || (activeTab === "fromItems" ? !hasSelection : !itemsDescription.trim())}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-all"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("outfits.generating")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t("outfits.generateOutfit")}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Full-Screen Loading Overlay */}
      {generating && (
        <div className="fixed inset-0 z-[60] xl:hidden flex items-center justify-center bg-background/98 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 px-8 text-center">
            {/* Animated icon container */}
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-foreground/10 to-foreground/5 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-foreground/70 animate-pulse" />
              </div>
              {/* Subtle rotating ring */}
              <div className="absolute inset-0 rounded-3xl border-2 border-foreground/10 border-t-foreground/30 animate-spin [animation-duration:2s]" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold tracking-tight">{t("outfits.creatingOutfit")}</p>
              <p className="text-sm text-muted-foreground">{t("outfits.generationTime")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Result Modal (keeps navbar visible) */}
      {!generating && generatedImage && (
        <div className="fixed inset-0 z-40 xl:hidden overflow-hidden bg-background">
          {/* Modal container - positioned between header and navbar */}
          <div className="absolute inset-x-3 top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.75rem)] bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.75rem)] flex flex-col bg-secondary/30 rounded-2xl overflow-hidden shadow-2xl border border-foreground/[0.06]">
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                setGeneratedImage(null);
                setOutfitName("");
              }}
              className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
              aria-label={t("outfits.newOutfit")}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Image - fills container */}
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="flex-1 relative min-h-0"
              aria-label={t("aria.expandPreview")}
            >
              <Image
                src={generatedImage}
                alt={t("outfits.generateOutfit")}
                fill
                className="object-cover"
                sizes="100vw"
              />
              {/* Fullscreen button */}
              <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                {t("outfits.tapToZoom")}
              </div>
            </button>

            {/* Bottom action bar */}
            <div className="flex-shrink-0 p-3 bg-background border-t border-foreground/[0.06]">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder={t("outfits.nameOutfitPlaceholder")}
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  className="flex-1 h-11 px-4 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 text-sm"
                />
                <FolderDropdown
                  folders={folders}
                  selectedId={selectedFolderId}
                  onSelect={setSelectedFolderId}
                  placeholder={t("folders.selectFolder")}
                  showClearOption={true}
                  clearLabel={t("folders.noFolder")}
                  compact
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !outfitName.trim()}
                  aria-label={t("outfits.save")}
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-foreground text-background disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  aria-label={t("aria.regenerateOutfit")}
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-secondary/80 text-foreground transition-colors active:scale-[0.98]"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Lightbox - z-[100] to be above everything including bottom nav */}
      <ImageLightbox
        src={generatedImage || ""}
        alt={t("outfits.generateOutfit")}
        open={previewOpen && !!generatedImage}
        onClose={() => setPreviewOpen(false)}
        closeLabel={t("aria.closeDialog")}
      />
    </div>
  );
}
