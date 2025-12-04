"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
      toast.error("Please select at least one item");
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
        throw new Error(data.error || "Failed to generate outfit");
      }

      setGeneratedImage(data.imageUrl);
      toast.success("Outfit generated!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate outfit";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!generatedImage || !outfitName.trim()) {
      toast.error("Please enter a name for the outfit");
      return;
    }

    if (!userId) {
      toast.error("You must be logged in to save outfits");
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

      toast.success("Outfit saved!");
      router.push("/outfits");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save outfit";
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
              aria-label="Clear selection"
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
            <div className="text-xs text-muted-foreground">{items.length} items available</div>
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
                No items in this category
              </p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      setExpandedSection(null);
                    }}
                    aria-label={`Select ${item.name}`}
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
          <p className="text-muted-foreground">Loading your wardrobe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/outfits"
          className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Create Outfit</h1>
          <p className="text-muted-foreground text-sm">
            Select items and let AI style them together
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
              Style
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {OUTFIT_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    style === s.value
                      ? "bg-foreground text-background"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
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
                <span className="text-sm">Display on mannequin</span>
              </label>

              {useMannequin && (
                <div className="mt-3 flex gap-1.5">
                  {MANNEQUIN_GENDERS.map((g) => (
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
                      {g.emoji} {g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Item Selectors - Accordion style */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <h3 className="text-sm font-medium p-4 pb-3 border-b border-border">
              Select Items
              {selectedCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-foreground text-background text-xs">
                  {selectedCount} selected
                </span>
              )}
            </h3>

            <div className="p-3 space-y-2">
              <ItemSection
                id="top"
                title="Top"
                items={topItems}
                selected={selectedTop}
                onSelect={setSelectedTop}
                icon={Shirt}
              />

              <ItemSection
                id="bottom"
                title="Bottom"
                items={bottomItems}
                selected={selectedBottom}
                onSelect={setSelectedBottom}
                icon={RectangleVertical}
              />

              {fullBodyItems.length > 0 && (
                <ItemSection
                  id="fullbody"
                  title="Full Body"
                  items={fullBodyItems}
                  selected={selectedFullBody}
                  onSelect={setSelectedFullBody}
                  icon={PersonStanding}
                />
              )}

              {footwearItems.length > 0 && (
                <ItemSection
                  id="footwear"
                  title="Footwear"
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
                      <div className="text-sm font-medium">Accessories</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedAccessories.length > 0
                          ? `${selectedAccessories.length} selected`
                          : `${accessoryItems.length} items available`}
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
                      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
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
                              aria-label={`${isSelected ? "Deselect" : "Select"} ${item.name}`}
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
                          Clear all accessories
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !hasSelection}
            className="hidden lg:flex w-full h-12 items-center justify-center gap-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate Outfit
              </>
            )}
          </button>
        </div>

        {/* Right: Preview Panel - Fixed width, stretches to match left panel */}
        <div className="w-full lg:w-[380px] lg:flex-shrink-0">
          <div className="h-full p-4 rounded-xl border border-border bg-card flex flex-col">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              Preview
            </h3>

            <div className="flex-1 relative rounded-xl overflow-hidden bg-secondary min-h-[300px]">
              {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Sparkles className="w-8 h-8 text-foreground/70 animate-pulse" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Creating outfit...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      10-20 seconds
                    </p>
                  </div>
                </div>
              ) : generatedImage ? (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="absolute inset-0 cursor-zoom-in"
                  aria-label="Expand preview"
                >
                  <Image
                    src={generatedImage}
                    alt="Generated outfit"
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
                      ? "Click Generate to create your outfit"
                      : "Select items to get started"}
                  </p>
                </div>
              )}
            </div>

            {/* Save Section */}
            {generatedImage && !generating && (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Name this outfit..."
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
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    aria-label="Regenerate outfit"
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

      {/* Mobile Sticky Generate Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border lg:hidden">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !hasSelection}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Generate Outfit {selectedCount > 0 && `(${selectedCount} items)`}
            </>
          )}
        </button>
      </div>

      {/* Preview Lightbox */}
      {previewOpen && generatedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <Image
              src={generatedImage}
              alt="Generated outfit"
              width={1024}
              height={1024}
              className="max-h-[85vh] w-auto rounded-xl object-contain"
              sizes="90vw"
            />
          </div>
        </div>
      )}
    </div>
  );
}
