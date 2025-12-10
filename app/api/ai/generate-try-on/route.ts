import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTryOnImage } from "@/lib/gemini";
import { isProRoute } from "@/lib/features";
import { isProUser } from "@/lib/supabase/subscription";
import { fetchImageAsBase64 } from "@/lib/images";

/**
 * Generate virtual try-on image via Gemini AI
 * Supports using individual wardrobe items or a saved outfit image
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isProRoute("/outfits/try-on")) {
      const userIsPro = await isProUser();
      if (!userIsPro) {
        return NextResponse.json(
          { error: "PRO_REQUIRED", message: "This feature requires a Pro subscription" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const {
      userPhotoBase64,
      itemIds,
      outfitId,
      mode,
    }: {
      userPhotoBase64?: string;
      itemIds?: string[];
      outfitId?: string;
      mode?: "items" | "outfits";
    } = body;

    // Validate user photo
    if (!userPhotoBase64) {
      return NextResponse.json({ error: "User photo is required" }, { status: 400 });
    }

    // Determine mode (items vs outfits) with backwards compatibility
    const effectiveMode: "items" | "outfits" =
      mode === "items" || mode === "outfits"
        ? mode
        : itemIds && itemIds.length > 0
        ? "items"
        : "outfits";

    // Mode-specific validation
    if (effectiveMode === "items" && (!itemIds || itemIds.length === 0)) {
      return NextResponse.json(
        { error: "At least one clothing item is required" },
        { status: 400 }
      );
    }

    if (effectiveMode === "outfits" && !outfitId) {
      return NextResponse.json(
        { error: "An outfit selection is required" },
        { status: 400 }
      );
    }

    // Build clothing items with categories for items mode
    let clothingItems: { base64: string; category: string }[] | undefined;
    let outfitImageBase64: string | undefined;

    if (effectiveMode === "items" && itemIds && itemIds.length > 0) {
      // Fetch item images with categories from database
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("id, name, image_url, categories(name, root)")
        .in("id", itemIds)
        .eq("user_id", user.id);

      if (itemsError) {
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
      }

      clothingItems = [];
      for (const item of items || []) {
        if (!item.image_url) continue;

        // Compress images for AI processing
        const base64 = await fetchImageAsBase64(item.image_url, `item ${item.id}`, true);
        if (base64) {
          // Get the root category (Headwear, Top, Bottom, Full Body, Footwear, Accessories)
          // Supabase returns the relation as an object (not array) for single FK
          const categoryData = item.categories as unknown as { name: string; root: string } | null;
          const category = categoryData?.root || "Top";
          clothingItems.push({ base64, category });
        }
      }

      if (clothingItems.length === 0) {
        return NextResponse.json(
          { error: "Could not load any clothing images. Please check your selection." },
          { status: 400 }
        );
      }
    }

    if (effectiveMode === "outfits" && outfitId) {
      // Fetch outfit image from database
      const { data: outfits, error: outfitsError } = await supabase
        .from("outfits")
        .select("id, name, generated_image_url")
        .eq("id", outfitId)
        .eq("user_id", user.id)
        .limit(1);

      if (outfitsError) {
        return NextResponse.json({ error: "Failed to fetch outfit" }, { status: 500 });
      }

      const outfit = outfits?.[0];

      if (!outfit || !outfit.generated_image_url) {
        return NextResponse.json(
          { error: "Selected outfit could not be found or has no image" },
          { status: 400 }
        );
      }

      // Compress outfit image for AI processing
      outfitImageBase64 = await fetchImageAsBase64(
        outfit.generated_image_url,
        `outfit ${outfit.id}`,
        true
      ) || undefined;

      if (!outfitImageBase64) {
        return NextResponse.json({ error: "Failed to load outfit image" }, { status: 400 });
      }
    }

    const result = await generateTryOnImage({
      mode: effectiveMode,
      userPhotoBase64: userPhotoBase64,
      clothingItems,
      outfitImageBase64,
    });

    const fileName = `tryon-${Date.now()}.jpg`;
    const imageBuffer = Buffer.from(result.imageBase64, "base64");

    const { error: uploadError } = await supabase.storage
      .from("wardrobe")
      .upload(`tryons/${fileName}`, imageBuffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to save generated image" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("wardrobe")
      .getPublicUrl(`tryons/${fileName}`);

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
      imageBase64: result.imageBase64,
      prompt: result.prompt,
    });

  } catch (error) {
    console.error("Generate try-on error:", error);

    const message = error instanceof Error ? error.message : "Failed to generate try-on";
    const errorWithStatus = error as { status?: number };

    if (errorWithStatus.status === 429 || message.includes("429") || message.includes("quota")) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait 30 seconds and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
