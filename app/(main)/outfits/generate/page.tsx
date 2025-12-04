"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/sonner";
import {
  Sparkles,
  Wand2,
  Shirt,
  X,
  Save,
  RefreshCw,
  ArrowLeft,
  Loader2,
  ChevronDown,
  Check,
  RectangleVertical,
  PersonStanding,
  Footprints,
  Watch,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { OUTFIT_STYLES, OutfitStyle, MANNEQUIN_GENDERS, MannequinGender } from "@/lib/gemini-types";

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

  // Selected items
  const [selectedTop, setSelectedTop] = useState<Item | null>(null);
  const [selectedBottom, setSelectedBottom] = useState<Item | null>(null);
  const [selectedFullBody, setSelectedFullBody] = useState<Item | null>(null);
  const [selectedFootwear, setSelectedFootwear] = useState<Item | null>(null);
  const [selectedAccessories, setSelectedAccessories] = useState<Item[]>([]);

  // Expanded sections
  const [expandedSection, setExpandedSection] = useState<string | null>("top");

  // Generation state
  const [style, setStyle] = useState<OutfitStyle>("casual");
  const [useMannequin, setUseMannequin] = useState(false);
  const [mannequinGender, setMannequinGender] = useState<MannequinGender>("female");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [outfitName, setOutfitName] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const t = useTranslations();

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

      // Load items for current user only
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

  const hasSelection = selectedTop || selectedBottom || selectedFullBody || selectedFootwear || selectedAccessories.length > 0;
  const selectedCount = [selectedTop, selectedBottom, selectedFullBody, selectedFootwear].filter(Boolean).length + selectedAccessories.length;

  async function handleGenerate() {
    if (!hasSelection) {
      toast.error(t("outfits.selectAtLeastOne"));
      return;
    }

    setGenerating(true);
    setGeneratedImage(null);

    try {
      const response = await fetch("/api/ai/generate-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topItemId: selectedTop?.id,
          bottomItemId: selectedBottom?.id,
          fullBodyItemId: selectedFullBody?.id,
          footwearItemId: selectedFootwear?.id,
          accessoryIds: selectedAccessories.map((a) => a.id),
          style,
          useMannequin,
          mannequinGender,
        }),
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

  // Compact item selector component
  function ItemSection({
    id,
    title,
    items,
    selected,
    onSelect,
    icon: Icon,
  }: {
    id: string;
    title: string;
    items: Item[];
    selected: Item | null;
    onSelect: (item: Item | null) => void;
    icon: LucideIcon;
  }) {
    const isExpanded = expandedSection === id;

    // When selected, show static header with clear button
    // When not selected, show clickable header to expand
    if (selected) {
      return (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 p-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0 relative">
              <Image
                src={selected.image_url}
                alt={selected.name}
                fill
                className="object-cover"
                sizes="100px"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{title}</div>
              <div className="text-xs text-muted-foreground">{selected.name}</div>
            </div>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("aria.clearSelection")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header - clickable when no selection */}
        <button
          type="button"
          onClick={() => setExpandedSection(isExpanded ? null : id)}
          className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors"
        >
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">{title}</div>
            <div className="text-xs text-muted-foreground">{t("outfits.itemsAvailable", { count: items.length })}</div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Expandable grid */}
        {isExpanded && !selected && (
          <div className="border-t border-border p-3 bg-secondary/30">
            {items.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                {t("outfits.noItemsInCategory")}
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      setExpandedSection(null);
                    }}
                    aria-label={t("aria.selectItem", { name: item.name })}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-foreground/30 transition-all hover:scale-105"
                  >
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="150px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
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

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/outfits"
          className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{t("outfits.createOutfit")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("outfits.selectItemsDescription")}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-6">
        {/* Left: Selection Panel - fills available space */}
        <div className="flex-1 space-y-4">
          {/* Style Selection - Compact */}
          <div className="p-4 rounded-xl border border-border bg-card">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              {t("outfits.style")}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {OUTFIT_STYLES.map((s) => {
                const styleLabels: Record<string, string> = {
                  casual: t("outfits.styles.casual"),
                  formal: t("outfits.styles.formal"),
                  "date-night": t("outfits.styles.dateNight"),
                  work: t("outfits.styles.work"),
                  street: t("outfits.styles.street"),
                  cozy: t("outfits.styles.cozy"),
                  elegant: t("outfits.styles.elegant"),
                };
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStyle(s.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      style === s.value
                        ? "bg-foreground text-background"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {s.emoji} {styleLabels[s.value]}
                  </button>
                );
              })}
            </div>

            {/* Mannequin Option */}
            <div className="mt-4 pt-4 border-t border-border">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useMannequin}
                  onChange={(e) => setUseMannequin(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-secondary accent-foreground"
                />
                <span className="text-sm">{t("outfits.displayOnMannequin")}</span>
              </label>

              {useMannequin && (
                <div className="mt-3 flex gap-1.5">
                  {MANNEQUIN_GENDERS.map((g) => {
                    const genderLabels: Record<string, string> = {
                      female: t("outfits.genders.female"),
                      male: t("outfits.genders.male"),
                    };
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setMannequinGender(g.value)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          mannequinGender === g.value
                            ? "bg-foreground text-background"
                            : "bg-secondary text-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {g.emoji} {genderLabels[g.value]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Item Selectors - Accordion style */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <h3 className="text-sm font-medium p-4 pb-3 border-b border-border">
              {t("outfits.selectItems")}
              {selectedCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-foreground text-background text-xs">
                  {t("outfits.selected", { count: selectedCount })}
                </span>
              )}
            </h3>

            <div className="p-3 space-y-2">
              <ItemSection
                id="top"
                title={t("categories.roots.top")}
                items={topItems}
                selected={selectedTop}
                onSelect={setSelectedTop}
                icon={Shirt}
              />

              <ItemSection
                id="bottom"
                title={t("categories.roots.bottom")}
                items={bottomItems}
                selected={selectedBottom}
                onSelect={setSelectedBottom}
                icon={RectangleVertical}
              />

              {fullBodyItems.length > 0 && (
                <ItemSection
                  id="fullbody"
                  title={t("categories.roots.fullBody")}
                  items={fullBodyItems}
                  selected={selectedFullBody}
                  onSelect={setSelectedFullBody}
                  icon={PersonStanding}
                />
              )}

              {footwearItems.length > 0 && (
                <ItemSection
                  id="footwear"
                  title={t("categories.roots.footwear")}
                  items={footwearItems}
                  selected={selectedFootwear}
                  onSelect={setSelectedFootwear}
                  icon={Footprints}
                />
              )}

              {/* Accessories - Multi-select */}
              {accessoryItems.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedSection(expandedSection === "accessories" ? null : "accessories")}
                    className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center">
                      <Watch className="w-5 h-5 text-muted-foreground" />
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
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !hasSelection}
            className="flex w-full h-12 items-center justify-center gap-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("outfits.generating")}
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                {t("outfits.generateOutfit")}
              </>
            )}
          </button>
        </div>

        {/* Right: Preview Panel - Fixed width, stretches to match left panel */}
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
                    <p className="text-sm font-medium">{t("outfits.creatingOutfit")}</p>
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
                    alt={t("outfits.generateOutfit")}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                </button>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground p-4">
                  <Wand2 className="w-8 h-8" />
                  <p className="text-center text-sm">
                    {hasSelection
                      ? t("outfits.clickGenerate")
                      : t("outfits.selectItemsToStart")}
                  </p>
                </div>
              )}
            </div>

            {/* Save Section */}
            {generatedImage && !generating && (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder={t("outfits.nameOutfitPlaceholder")}
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
                    aria-label={t("aria.regenerateOutfit")}
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
