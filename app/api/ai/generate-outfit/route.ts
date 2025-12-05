import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateOutfitImage, OutfitStyle, MannequinGender } from "@/lib/gemini";
import { isProRoute } from "@/lib/features";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check Pro subscription (only if feature is Pro-gated)
    if (isProRoute("/outfits/generate")) {
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("tier")
        .eq("user_id", user.id)
        .single();

      if (!subscription || subscription.tier !== "pro") {
        return NextResponse.json(
          { error: "PRO_REQUIRED", message: "This feature requires a Pro subscription" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { topItemId, bottomItemId, fullBodyItemId, footwearItemId, accessoryIds, style, additionalPrompt, useMannequin, mannequinGender } = body;

    // Fetch item images from database
    const itemIds = [topItemId, bottomItemId, fullBodyItemId, footwearItemId, ...(accessoryIds || [])].filter(Boolean);

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

    // Convert image URLs to base64
    const imageMap: Record<string, string> = {};

    for (const item of items || []) {
      if (item.image_url) {
        try {
          const response = await fetch(item.image_url);
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          imageMap[item.id] = base64;
        } catch (e) {
          console.error(`Failed to fetch image for item ${item.id}:`, e);
        }
      }
    }

    // Generate outfit image
    const result = await generateOutfitImage({
      topImageBase64: topItemId ? imageMap[topItemId] : undefined,
      bottomImageBase64: bottomItemId ? imageMap[bottomItemId] : undefined,
      fullBodyImageBase64: fullBodyItemId ? imageMap[fullBodyItemId] : undefined,
      footwearImageBase64: footwearItemId ? imageMap[footwearItemId] : undefined,
      accessoryImagesBase64: accessoryIds?.map((id: string) => imageMap[id]).filter(Boolean),
      style: style as OutfitStyle,
      additionalPrompt,
      useMannequin,
      mannequinGender: mannequinGender as MannequinGender,
    });

    // Upload generated image to Supabase Storage
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
    console.error("Generate outfit error:", error);

    const message = error instanceof Error ? error.message : "Failed to generate outfit";
    const errorWithStatus = error as { status?: number };

    // Handle rate limit errors
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
