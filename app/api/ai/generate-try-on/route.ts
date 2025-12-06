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
    const { userPhotoBase64, itemIds, outfitDescription, outfitImageUrl } = body;

    // Validate user photo
    if (!userPhotoBase64) {
      return NextResponse.json({ error: "User photo is required" }, { status: 400 });
    }

    // Validate that we have either itemIds OR outfitImageUrl
    if ((!itemIds || itemIds.length === 0) && !outfitImageUrl) {
      return NextResponse.json({ error: "At least one clothing item or outfit is required" }, { status: 400 });
    }

    const clothingImagesBase64: string[] = [];
    let finalDescription = outfitDescription || "";

    if (itemIds && itemIds.length > 0) {
      // Fetch item images from database
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("id, name, image_url")
        .in("id", itemIds);

      if (itemsError) {
        return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
      }

      const itemNames: string[] = [];

      for (const item of items || []) {
        if (!item.image_url) continue;

        const base64 = await fetchImageAsBase64(item.image_url, `item ${item.id}`);
        if (base64) {
          clothingImagesBase64.push(base64);
          itemNames.push(item.name);
        }
      }

      if (!finalDescription) {
        finalDescription = itemNames.join(", ");
      }
    }

    if (outfitImageUrl) {
      const base64 = await fetchImageAsBase64(outfitImageUrl, "outfit image");
      if (!base64) {
        return NextResponse.json({ error: "Failed to load outfit image" }, { status: 400 });
      }
      clothingImagesBase64.push(base64);
    }

    if (clothingImagesBase64.length === 0) {
      return NextResponse.json(
        { error: "Could not load any clothing images. Please check your selection." },
        { status: 400 }
      );
    }

    const result = await generateTryOnImage({
      userPhotoBase64,
      outfitDescription: finalDescription,
      clothingImagesBase64,
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
