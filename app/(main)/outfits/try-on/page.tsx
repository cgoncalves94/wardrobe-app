/**
 * Virtual try-on page for applying outfits to user photos via AI
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
import ImageUploader from "@/components/ImageUploader";
import ItemRow from "@/components/ItemRow";
import LoadingState from "@/components/LoadingState";
import ImageLightbox from "@/components/ImageLightbox";
import { urlToBase64 } from "@/lib/images.client";
import type { Item, Outfit } from "@/types";
import { toast } from "@/components/ui/sonner";
import {
  Sparkles,
  X,
  Save,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Camera,
  Shirt,
  ImageIcon,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { getRootIcon } from "@/lib/categories";
import Link from "next/link";
import { isProRoute } from "@/lib/features";

type SelectionMode = "items" | "outfits";

/** Number of outfits to show per page in the grid (3x3) */
const OUTFITS_PER_PAGE = 9;

/**
 * Virtual try-on page component
 */
export default function TryOnPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [savedOutfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection mode (tabs)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("items");

  // User photo state
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);

  // Selected items (for items mode)
  const [selectedHeadwear, setSelectedHeadwear] = useState<Item | null>(null);
  const [selectedTop, setSelectedTop] = useState<Item | null>(null);
  const [selectedBottom, setSelectedBottom] = useState<Item | null>(null);
  const [selectedFullBody, setSelectedFullBody] = useState<Item | null>(null);
  const [selectedFootwear, setSelectedFootwear] = useState<Item | null>(null);
  const [selectedAccessories, setSelectedAccessories] = useState<Item[]>([]);

  // Selected outfit (for outfits mode)
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);

  // Pagination for saved outfits
  const [outfitPage, setOutfitPage] = useState(0);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [outfitName, setOutfitName] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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

  // Lock body scroll when mobile result modal is open
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Load items and outfits in parallel
      const [itemsResult, outfitsResult] = await Promise.all([
        supabase
          .from("items")
          .select("id, name, image_url, category_id, categories(name, root)")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("outfits")
          .select("id, name, generated_image_url")
          .eq("user_id", user?.id)
          .eq("type", "outfit") // Only show outfit generations, not try-ons
          .order("created_at", { ascending: false }),
      ]);

      setItems((itemsResult.data || []) as unknown as Item[]);
      setOutfits((outfitsResult.data || []) as Outfit[]);
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

  // Collect all selected items for display
  const allSelectedItems = [
    selectedHeadwear,
    selectedTop,
    selectedBottom,
    selectedFullBody,
    selectedFootwear,
    ...selectedAccessories,
  ].filter(Boolean) as Item[];

  const hasItemSelection = allSelectedItems.length > 0;
  const selectedCount = allSelectedItems.length;

  // Lock controls when generating or showing results
  const isLocked = !!generatedImage || generating;

  // Can generate if we have a photo AND either items selected OR an outfit selected
  const canGenerate = userPhotoUrl && (
    (selectionMode === "items" && hasItemSelection) ||
    (selectionMode === "outfits" && selectedOutfit)
  );

  // Clear all item selections
  function clearAllSelections() {
    setSelectedHeadwear(null);
    setSelectedTop(null);
    setSelectedBottom(null);
    setSelectedFullBody(null);
    setSelectedFootwear(null);
    setSelectedAccessories([]);
  }

  // Clear item selections when switching to outfit mode
  function handleTabChange(mode: SelectionMode) {
    if (isLocked) return;
    setSelectionMode(mode);
    if (mode === "outfits") {
      clearAllSelections();
    } else {
      setSelectedOutfit(null);
    }
  }

  // Build outfit description from selected items
  function buildOutfitDescription(): string {
    if (selectionMode === "outfits" && selectedOutfit) {
      return selectedOutfit.name;
    }
    const parts: string[] = [];
    if (selectedHeadwear) parts.push(selectedHeadwear.name);
    if (selectedTop) parts.push(selectedTop.name);
    if (selectedBottom) parts.push(selectedBottom.name);
    if (selectedFullBody) parts.push(selectedFullBody.name);
    if (selectedFootwear) parts.push(selectedFootwear.name);
    selectedAccessories.forEach(a => parts.push(a.name));
    return parts.join(", ");
  }

  // Get all selected item IDs
  function getSelectedItemIds(): string[] {
    return allSelectedItems.map(item => item.id);
  }

  async function handleGenerate() {
    if (!userPhotoUrl) {
      toast.error(t("outfits.tryOn.uploadPhotoRequired"));
      return;
    }

    if (selectionMode === "items" && !hasItemSelection) {
      toast.error(t("outfits.selectAtLeastOne"));
      return;
    }

    if (selectionMode === "outfits" && !selectedOutfit) {
      toast.error(t("outfits.tryOn.selectOutfit"));
      return;
    }

    setGenerating(true);
    setGeneratedImage(null);

    try {
      // Convert user photo to base64
      const userPhotoBase64 = await urlToBase64(userPhotoUrl);

      // Build request body based on selection mode
      const requestBody: {
        userPhotoBase64: string;
        outfitDescription: string;
        itemIds?: string[];
        outfitImageUrl?: string;
      } = {
        userPhotoBase64,
        outfitDescription: buildOutfitDescription(),
      };

      if (selectionMode === "items") {
        requestBody.itemIds = getSelectedItemIds();
      } else if (selectedOutfit) {
        requestBody.outfitImageUrl = selectedOutfit.generated_image_url;
      }

      const response = await fetch("/api/ai/generate-try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("outfits.tryOn.failedToGenerate"));
      }

      setGeneratedImage(data.imageUrl);
      toast.success(t("outfits.tryOn.tryOnGenerated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("outfits.tryOn.failedToGenerate");
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
        type: "tryon", // Mark as virtual try-on, not a regular outfit
      });

      if (error) throw error;

      toast.success(t("outfits.tryOn.tryOnSaved"));
      router.push("/outfits?tab=tryons");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("outfits.tryOn.failedToSave");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  // Loading state
  if (loading || subscriptionLoading) {
    return <LoadingState message={t("outfits.loadingWardrobe")} />;
  }

  // Gate: Show locked state for free users
  if (isProRoute("/outfits/try-on") && !isPro) {
    return (
      <div className="pb-20 lg:pb-8">
        <div className="mb-6">
          <Link
            href="/outfits"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("outfits.title")}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{t("outfits.tryOn.title")}</h1>
        </div>
        <ProFeatureGate featureKey="tryOn" />
      </div>
    );
  }

  return (
    <div className="pb-4 lg:pb-8">
      {/* Header - Minimal (matching Generate page) */}
      <div className="mb-6">
        <Link
          href="/outfits"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("outfits.title")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("outfits.tryOn.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("outfits.tryOn.description")}
        </p>
      </div>

      {/* Main Content - Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Left Column: Selection Panel */}
        <div className={generating || generatedImage ? "hidden lg:block" : ""}>
          <div className="space-y-4">
            {/* Step 1: Upload Photo */}
            <div className="p-5 rounded-2xl bg-secondary/30 border border-foreground/[0.04]">
              <div className="flex items-center gap-2.5 mb-3">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("outfits.tryOn.step1")}: {t("outfits.tryOn.uploadPhoto")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {t("outfits.tryOn.uploadPhotoDesc")}
              </p>
              <ImageUploader
                bucket="wardrobe"
                folder="tryons"
                onUploaded={(_, publicUrl) => setUserPhotoUrl(publicUrl)}
                imageUrl={userPhotoUrl || undefined}
                preserveAspect
              />
            </div>

            {/* Step 2: Select Outfit */}
            <div className="p-5 rounded-2xl bg-secondary/30 border border-foreground/[0.04]">
              <div className="flex items-center gap-2.5 mb-4">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("outfits.tryOn.step2")}: {t("outfits.tryOn.selectOutfit")}
                </span>
              </div>

              {/* Mode Tabs (matching Generate page rounded-full style) */}
              <div className={`flex gap-2 mb-5 ${isLocked ? "opacity-50 pointer-events-none" : ""}`}>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleTabChange("items")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                    selectionMode === "items"
                      ? "bg-foreground text-background"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Shirt className="w-4 h-4" />
                  {t("outfits.tryOn.tabItems")}
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleTabChange("outfits")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                    selectionMode === "outfits"
                      ? "bg-foreground text-background"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  {t("outfits.tryOn.tabOutfits")}
                </button>
              </div>

              {/* Tab Content - Grid stacking for consistent height */}
              <div className="grid min-w-0">
                {/* Items Selection - always rendered, visibility controlled */}
                <div className={`[grid-area:1/1] min-w-0 transition-opacity duration-0 ${
                  selectionMode !== "items" ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}>
                  <div className="space-y-5">
                    {/* Selection strip - shows selected items */}
                    {selectedCount > 0 && (
                      <div className="flex items-center gap-3 pb-3 border-b border-foreground/[0.06]">
                        <div className="flex gap-2 flex-1 overflow-x-auto scrollbar-hide">
                          {allSelectedItems.map((item) => (
                            <div
                              key={item.id}
                              className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-foreground/20"
                            >
                              <Image
                                src={item.image_url!}
                                alt={item.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={clearAllSelections}
                          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          aria-label={t("aria.clearSelection")}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

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
                        // Full-body outfits exclude separate tops
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
                        // Full-body outfits exclude separate bottoms
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
                          // Full-body clears top and bottom
                          if (item) {
                            setSelectedTop(null);
                            setSelectedBottom(null);
                          }
                          setSelectedFullBody(item);
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
                        multiSelect
                        selectedMulti={selectedAccessories}
                        onMultiSelect={setSelectedAccessories}
                        icon={getRootIcon("Accessories")}
                        disabled={isLocked}
                      />
                    )}
                  </div>
                </div>

                {/* Saved Outfits Selection - always rendered, visibility controlled */}
                <div className={`[grid-area:1/1] min-w-0 transition-opacity duration-0 ${
                  selectionMode !== "outfits" ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}>
                  {/* Paginated grid of saved outfits */}
                  <div className="space-y-4">
                  {savedOutfits.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-foreground/5 border border-border/30 flex items-center justify-center mb-4">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t("outfits.tryOn.noOutfits")}
                      </p>
                      <Link
                        href="/outfits/generate"
                        className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                      >
                        {t("outfits.createOutfit")}
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* Header */}
                      <div className="flex items-center gap-2 px-1">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t("outfits.tryOn.savedOutfits")}
                        </span>
                        <span className="text-xs text-muted-foreground/50">{savedOutfits.length}</span>
                      </div>

                      {/* Grid - 2x3 on mobile, 3x2 on larger screens */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {savedOutfits
                          .slice(outfitPage * OUTFITS_PER_PAGE, (outfitPage + 1) * OUTFITS_PER_PAGE)
                          .map((outfit) => {
                            const isSelected = selectedOutfit?.id === outfit.id;
                            return (
                              <button
                                key={outfit.id}
                                type="button"
                                onClick={() => setSelectedOutfit(isSelected ? null : outfit)}
                                disabled={isLocked}
                                className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-200 ${
                                  isLocked
                                    ? "opacity-50"
                                    : isSelected
                                    ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-[1.02]"
                                    : "hover:scale-[1.02] opacity-80 hover:opacity-100"
                                }`}
                              >
                                <Image
                                  src={outfit.generated_image_url}
                                  alt={outfit.name}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 45vw, 150px"
                                />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                                      <Check className="w-4 h-4 text-black" />
                                    </div>
                                  </div>
                                )}
                                {/* Name overlay */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                  <p className="text-xs text-white truncate">{outfit.name}</p>
                                </div>
                              </button>
                            );
                          })}
                      </div>

                      {/* Pagination controls */}
                      {savedOutfits.length > OUTFITS_PER_PAGE && (
                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => setOutfitPage((p) => Math.max(0, p - 1))}
                            disabled={outfitPage === 0 || isLocked}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            {t("common.previous")}
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {outfitPage + 1} / {Math.ceil(savedOutfits.length / OUTFITS_PER_PAGE)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setOutfitPage((p) => Math.min(Math.ceil(savedOutfits.length / OUTFITS_PER_PAGE) - 1, p + 1))}
                            disabled={outfitPage >= Math.ceil(savedOutfits.length / OUTFITS_PER_PAGE) - 1 || isLocked}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                          >
                            {t("common.next")}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Generate Button (inline) */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !canGenerate}
              className="w-full lg:hidden flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-foreground text-background font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-all active:scale-[0.98]"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("outfits.tryOn.generating")}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t("outfits.tryOn.generateTryOn")}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Preview Panel (Desktop) */}
        <div className="hidden lg:flex lg:flex-col">
          <div className="flex-1 p-5 rounded-2xl bg-secondary/30 border border-foreground/[0.04] flex flex-col min-h-[400px]">
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
                    <p className="text-sm font-medium">{t("outfits.tryOn.generating")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("outfits.generationTime")}</p>
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
                      alt={t("outfits.tryOn.title")}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                    {/* Gradient overlay for save controls */}
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  </button>
                  {/* Close/New button */}
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedImage(null);
                      setOutfitName("");
                    }}
                    className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
                    aria-label={t("outfits.newOutfit")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-foreground/5 border border-border/30 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center px-4">
                    {canGenerate
                      ? t("outfits.tryOn.clickGenerate")
                      : t("outfits.tryOn.selectItemsToStart")}
                  </p>
                </div>
              )}

              {/* Save Controls - Overlaid on image when result exists */}
              {generatedImage && !generating && (
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder={t("outfits.tryOn.namePlaceholder")}
                      value={outfitName}
                      onChange={(e) => setOutfitName(e.target.value)}
                      className="flex-1 h-11 px-4 rounded-xl bg-black/60 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !outfitName.trim()}
                      className="h-11 px-5 flex items-center justify-center gap-2 rounded-xl bg-white text-black font-medium text-sm disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {t("outfits.save")}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      aria-label={t("outfits.tryOn.regenerate")}
                      className="w-11 h-11 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-black/70 transition-colors active:scale-[0.98]"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Action Bar */}
            {!generatedImage && (
              <div className="mt-4 flex-shrink-0">
                <div className="p-3 rounded-xl bg-secondary/30 border border-foreground/[0.04]">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating || !canGenerate}
                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-all active:scale-[0.98]"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("outfits.tryOn.generating")}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {t("outfits.tryOn.generateTryOn")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Full-Screen Loading Overlay */}
      {generating && (
        <div className="fixed inset-0 z-[60] lg:hidden flex items-center justify-center bg-background/98 backdrop-blur-sm">
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
              <p className="text-xl font-semibold tracking-tight">{t("outfits.tryOn.generating")}</p>
              <p className="text-sm text-muted-foreground">{t("outfits.generationTime")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Result Modal (keeps navbar visible) */}
      {!generating && generatedImage && (
        <div className="fixed inset-0 z-40 lg:hidden overflow-hidden bg-background">
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
                alt={t("outfits.tryOn.title")}
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
                  placeholder={t("outfits.tryOn.namePlaceholder")}
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  className="flex-1 h-11 px-4 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 text-sm"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !outfitName.trim()}
                  className="h-11 px-5 flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-medium text-sm disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t("outfits.save")}
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  aria-label={t("outfits.tryOn.regenerate")}
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
        alt={t("outfits.tryOn.title")}
        open={previewOpen && !!generatedImage}
        onClose={() => setPreviewOpen(false)}
        closeLabel={t("aria.closeDialog")}
      />
    </div>
  );
}
