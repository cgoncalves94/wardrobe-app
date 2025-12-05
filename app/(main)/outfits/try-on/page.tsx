"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import ProFeatureGate from "@/components/ProFeatureGate";
import ImageUploader from "@/components/ImageUploader";
import ItemSection from "@/components/ItemSection";
import { toast } from "@/components/ui/sonner";
import {
  Sparkles,
  Wand2,
  X,
  Save,
  RefreshCw,
  ArrowLeft,
  Loader2,
  ChevronDown,
  Check,
  Camera,
  Shirt,
  ImageIcon,
} from "lucide-react";
import { getRootIcon } from "@/lib/categories";
import Link from "next/link";
import { isProRoute } from "@/lib/features";

type Item = {
  id: string;
  name: string;
  image_url: string;
  category_id: string;
  categories?: { name: string; root: string } | null;
};

type Outfit = {
  id: string;
  name: string;
  generated_image_url: string;
};

type SelectionMode = "items" | "outfits";

export default function TryOnPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
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

  // Expanded sections
  const [expandedSection, setExpandedSection] = useState<string | null>("top");

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
      setSavedOutfits((outfitsResult.data || []) as Outfit[]);
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  // Filter items by category root
  const headwearItems = items.filter(
    (item) => item.categories?.root === "Headwear"
  );
  const topItems = items.filter(
    (item) => item.categories?.root === "Top"
  );
  const bottomItems = items.filter(
    (item) => item.categories?.root === "Bottom"
  );
  const fullBodyItems = items.filter(
    (item) => item.categories?.root === "Full Body"
  );
  const footwearItems = items.filter(
    (item) => item.categories?.root === "Footwear"
  );
  const accessoryItems = items.filter(
    (item) => item.categories?.root === "Accessories"
  );

  const hasItemSelection = selectedHeadwear || selectedTop || selectedBottom || selectedFullBody || selectedFootwear || selectedAccessories.length > 0;
  const selectedCount = [selectedHeadwear, selectedTop, selectedBottom, selectedFullBody, selectedFootwear].filter(Boolean).length + selectedAccessories.length;
  const itemSectionLabels = {
    itemsAvailable: (count: number) => t("outfits.itemsAvailable", { count }),
    noItemsInCategory: t("outfits.noItemsInCategory"),
    selectItem: (name: string) => t("aria.selectItem", { name }),
    clearSelection: t("aria.clearSelection"),
  };

  // Can generate if we have a photo AND either items selected OR an outfit selected
  const canGenerate = userPhotoUrl && (
    (selectionMode === "items" && hasItemSelection) ||
    (selectionMode === "outfits" && selectedOutfit)
  );

  // Clear item selections when switching to outfit mode
  function handleTabChange(mode: SelectionMode) {
    setSelectionMode(mode);
    if (mode === "outfits") {
      // Clear item selections
      setSelectedHeadwear(null);
      setSelectedTop(null);
      setSelectedBottom(null);
      setSelectedFullBody(null);
      setSelectedFootwear(null);
      setSelectedAccessories([]);
    } else {
      // Clear outfit selection
      setSelectedOutfit(null);
    }
  }

  // Convert URL to base64
  async function urlToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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
    const ids: string[] = [];
    if (selectedHeadwear) ids.push(selectedHeadwear.id);
    if (selectedTop) ids.push(selectedTop.id);
    if (selectedBottom) ids.push(selectedBottom.id);
    if (selectedFullBody) ids.push(selectedFullBody.id);
    if (selectedFootwear) ids.push(selectedFootwear.id);
    selectedAccessories.forEach(a => ids.push(a.id));
    return ids;
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
      toast.error(t("outfits.tryOn.selectSavedOutfit"));
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
      router.push("/outfits");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("outfits.tryOn.failedToSave");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  // Compact item selector component
  if (loading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-xl bg-secondary flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-foreground/70 animate-pulse" />
          </div>
          <p className="text-muted-foreground">{t("outfits.loadingWardrobe")}</p>
        </div>
      </div>
    );
  }

  // Header component
  const header = (
    <div className="flex items-center gap-4 mb-6">
      <Link
        href="/outfits"
        className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <div>
        <h1 className="text-xl font-semibold">{t("outfits.tryOn.title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("outfits.tryOn.description")}
        </p>
      </div>
    </div>
  );

  // Gate: Show locked state for free users
  if (isProRoute("/outfits/try-on") && !isPro) {
    return (
      <div className="pb-20 lg:pb-8">
        {header}
        <ProFeatureGate featureKey="tryOn" />
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-8">
      {header}

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-6">
        {/* Left: Selection Panel */}
        <div className="flex-1 space-y-4">
          {/* Step 1: Upload Photo */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-muted-foreground" />
              {t("outfits.tryOn.step1")}: {t("outfits.tryOn.uploadPhoto")}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t("outfits.tryOn.uploadPhotoDesc")}
            </p>
            <ImageUploader
              bucket="wardrobe"
              folder="tryons"
              onUploaded={(_, publicUrl) => setUserPhotoUrl(publicUrl)}
              imageUrl={userPhotoUrl || undefined}
            />
          </div>

          {/* Step 2: Select Outfit - with Tabs */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 pb-3 border-b border-border">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                {t("outfits.tryOn.step2")}: {t("outfits.tryOn.selectOutfit")}
              </h3>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                <button
                  type="button"
                  onClick={() => handleTabChange("items")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    selectionMode === "items"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Shirt className="w-4 h-4" />
                  {t("outfits.tryOn.tabItems")}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("outfits")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    selectionMode === "outfits"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  {t("outfits.tryOn.tabOutfits")}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {selectionMode === "items" ? (
              /* Items Selection */
              <div className="p-3 space-y-2">
                {selectedCount > 0 && (
                  <div className="text-xs text-muted-foreground mb-2">
                    {t("outfits.selected", { count: selectedCount })}
                  </div>
                )}

                {headwearItems.length > 0 && (
                <ItemSection
                  id="headwear"
                  title={t("categories.roots.headwear")}
                  items={headwearItems}
                  selected={selectedHeadwear}
                  onSelect={setSelectedHeadwear}
                  icon={getRootIcon("Headwear")}
                  expandedSection={expandedSection}
                  onExpandedChange={setExpandedSection}
                  labels={itemSectionLabels}
                />
              )}

              <ItemSection
                id="top"
                title={t("categories.roots.top")}
                items={topItems}
                selected={selectedTop}
                onSelect={setSelectedTop}
                icon={getRootIcon("Top")}
                expandedSection={expandedSection}
                onExpandedChange={setExpandedSection}
                labels={itemSectionLabels}
              />

              <ItemSection
                id="bottom"
                title={t("categories.roots.bottom")}
                items={bottomItems}
                selected={selectedBottom}
                onSelect={setSelectedBottom}
                icon={getRootIcon("Bottom")}
                expandedSection={expandedSection}
                onExpandedChange={setExpandedSection}
                labels={itemSectionLabels}
              />

              {fullBodyItems.length > 0 && (
                <ItemSection
                  id="fullbody"
                  title={t("categories.roots.fullBody")}
                  items={fullBodyItems}
                  selected={selectedFullBody}
                  onSelect={setSelectedFullBody}
                  icon={getRootIcon("Full Body")}
                  expandedSection={expandedSection}
                  onExpandedChange={setExpandedSection}
                  labels={itemSectionLabels}
                />
              )}

              {footwearItems.length > 0 && (
                <ItemSection
                  id="footwear"
                  title={t("categories.roots.footwear")}
                  items={footwearItems}
                  selected={selectedFootwear}
                  onSelect={setSelectedFootwear}
                  icon={getRootIcon("Footwear")}
                  expandedSection={expandedSection}
                  onExpandedChange={setExpandedSection}
                  labels={itemSectionLabels}
                />
              )}

                {/* Accessories - Multi-select */}
                {accessoryItems.length > 0 && (() => {
                  const AccessoriesIcon = getRootIcon("Accessories");
                  return (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "accessories" ? null : "accessories")}
                      className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center">
                        <AccessoriesIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{t("categories.roots.accessories")}</div>
                        <div className="text-xs text-muted-foreground">
                          {selectedAccessories.length > 0
                            ? t("outfits.selected", { count: selectedAccessories.length })
                            : t("outfits.itemsAvailable", { count: accessoryItems.length })}
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expandedSection === "accessories" ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {expandedSection === "accessories" && (
                      <div className="border-t border-border p-3 bg-secondary/30">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          {accessoryItems.map((item) => {
                            const isSelected = selectedAccessories.some((a) => a.id === item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedAccessories((prev) => prev.filter((a) => a.id !== item.id));
                                  } else {
                                    setSelectedAccessories((prev) => [...prev, item]);
                                  }
                                }}
                                aria-label={isSelected ? t("aria.deselectItem", { name: item.name }) : t("aria.selectItem", { name: item.name })}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                                  isSelected
                                    ? "border-foreground ring-2 ring-foreground/20"
                                    : "border-transparent hover:border-foreground/30"
                                }`}
                              >
                                <Image
                                  src={item.image_url}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                  sizes="150px"
                                />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <Check className="w-5 h-5 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {selectedAccessories.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedAccessories([])}
                            className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {t("outfits.clearAllAccessories")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })()}
              </div>
            ) : (
              /* Saved Outfits Selection */
              <div className="p-3">
                {savedOutfits.length === 0 ? (
                  <div className="text-center py-8">
                    <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {t("outfits.tryOn.noSavedOutfits")}
                    </p>
                    <Link
                      href="/outfits/generate"
                      className="inline-flex items-center gap-1 text-sm font-medium mt-3 hover:underline"
                    >
                      {t("outfits.createOutfit")}
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {savedOutfits.map((outfit) => {
                      const isSelected = selectedOutfit?.id === outfit.id;
                      return (
                        <button
                          key={outfit.id}
                          type="button"
                          onClick={() => setSelectedOutfit(isSelected ? null : outfit)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                            isSelected
                              ? "border-foreground ring-2 ring-foreground/20"
                              : "border-transparent hover:border-foreground/30"
                          }`}
                        >
                          <Image
                            src={outfit.generated_image_url}
                            alt={outfit.name}
                            fill
                            className="object-cover"
                            sizes="200px"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Check className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="text-xs text-white truncate">{outfit.name}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !canGenerate}
            className="flex w-full h-12 items-center justify-center gap-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("outfits.tryOn.generating")}
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                {t("outfits.tryOn.generateTryOn")}
              </>
            )}
          </button>
        </div>

        {/* Right: Preview Panel */}
        <div className="w-full lg:w-[380px] lg:flex-shrink-0">
          <div className="h-full p-4 rounded-xl border border-border bg-card flex flex-col">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              {t("outfits.preview")}
            </h3>

            <div className="flex-1 relative rounded-xl overflow-hidden bg-secondary min-h-[300px]">
              {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Sparkles className="w-8 h-8 text-foreground/70 animate-pulse" />
                  <div className="text-center">
                    <p className="text-sm font-medium">{t("outfits.tryOn.generating")}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("outfits.generationTime")}
                    </p>
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
                    alt={t("outfits.tryOn.title")}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                </button>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground p-4">
                  <Wand2 className="w-8 h-8" />
                  <p className="text-center text-sm">
                    {canGenerate
                      ? t("outfits.tryOn.clickGenerate")
                      : t("outfits.tryOn.selectItemsToStart")}
                  </p>
                </div>
              )}
            </div>

            {/* Save Section */}
            {generatedImage && !generating && (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder={t("outfits.tryOn.namePlaceholder")}
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !outfitName.trim()}
                    className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {t("outfits.save")}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    aria-label={t("outfits.tryOn.regenerate")}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Lightbox */}
      {previewOpen && generatedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95"
          onClick={() => setPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="absolute top-4 right-4 p-3 rounded-full bg-black/60 text-white/90 hover:text-white hover:bg-black/80 transition-colors z-10"
            aria-label={t("aria.closeDialog")}
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="relative w-full h-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={generatedImage}
              alt={t("outfits.tryOn.title")}
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
