import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateOutfitImage, generateOutfitFromPrompt, OutfitStyle, MannequinGender } from "@/lib/gemini";
import { isProRoute } from "@/lib/features";
import { isProUser } from "@/lib/supabase/subscription";
import { fetchImageAsBase64 } from "@/lib/images";
import { handleAIGenerationError } from "@/lib/api-helpers";

/**
 * Generate outfit image via Gemini AI
 * Supports two modes: From Items (compose from wardrobe) or AI Picks (text-to-image)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isProRoute("/outfits/generate")) {
      const userIsPro = await isProUser();
      if (!userIsPro) {
        return NextResponse.json(
          { error: "PRO_REQUIRED", message: "This feature requires a Pro subscription" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { headwearItemId, topItemId, outerwearItemId, bottomItemId, fullBodyItemId, footwearItemId, accessoryIds, itemsDescription, style, useMannequin, mannequinGender } = body;

    let result: { imageBase64: string; prompt: string };

    if (itemsDescription) {
      if (!style) {
        return NextResponse.json({ error: "Style is required for AI-generated outfits" }, { status: 400 });
      }

      result = await generateOutfitFromPrompt({
        itemsDescription,
        style: style as OutfitStyle,
        useMannequin,
        mannequinGender: mannequinGender as MannequinGender,
      });
    } else {
      const itemIds = [headwearItemId, topItemId, outerwearItemId, bottomItemId, fullBodyItemId, footwearItemId, ...(accessoryIds || [])].filter(Boolean);

      if (itemIds.length === 0) {
        return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
      }

      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("id, image_url")
        .in("id", itemIds);

      if (itemsError) {
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
      }

      const imageMap: Record<string, string> = {};

      const imageResults = await Promise.all(
        (items || []).map(async (item) => ({
          id: item.id,
          base64: item.image_url ? await fetchImageAsBase64(item.image_url, `item ${item.id}`) : null
        }))
      );
      for (const result of imageResults) {
        if (result.base64) imageMap[result.id] = result.base64;
      }

      if (Object.keys(imageMap).length === 0) {
        return NextResponse.json(
          { error: "Could not load any item images. Please check your wardrobe items." },
          { status: 400 }
        );
      }

      result = await generateOutfitImage({
        headwearImageBase64: headwearItemId ? imageMap[headwearItemId] : undefined,
        topImageBase64: topItemId ? imageMap[topItemId] : undefined,
        outerwearImageBase64: outerwearItemId ? imageMap[outerwearItemId] : undefined,
        bottomImageBase64: bottomItemId ? imageMap[bottomItemId] : undefined,
        fullBodyImageBase64: fullBodyItemId ? imageMap[fullBodyItemId] : undefined,
        footwearImageBase64: footwearItemId ? imageMap[footwearItemId] : undefined,
        accessoryImagesBase64: accessoryIds?.map((id: string) => imageMap[id]).filter(Boolean),
        useMannequin,
        mannequinGender: mannequinGender as MannequinGender,
      });
    }

    const fileName = `outfit-${Date.now()}.jpg`;
    const imageBuffer = Buffer.from(result.imageBase64, "base64");

    const { error: uploadError } = await supabase.storage
      .from("wardrobe")
      .upload(`outfits/${fileName}`, imageBuffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to save generated image" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("wardrobe")
      .getPublicUrl(`outfits/${fileName}`);

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
      imageBase64: result.imageBase64,
      prompt: result.prompt,
    });

  } catch (error) {
    return handleAIGenerationError(error, "outfit");
  }
}
