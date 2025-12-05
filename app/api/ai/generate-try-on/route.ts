import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTryOnImage } from "@/lib/gemini";
import { isProRoute } from "@/lib/features";
import { isProUser } from "@/lib/supabase/subscription";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check Pro subscription (only if feature is Pro-gated)
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

    // Mode 1: Using individual items
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
        if (item.image_url) {
          try {
            const response = await fetch(item.image_url);
            const contentType = response.headers.get("content-type") || "";

            if (!response.ok) {
              console.error(`Failed to fetch image for item ${item.id}: HTTP ${response.status}`);
              continue;
            }

            if (!contentType.startsWith("image/")) {
              console.error(`Invalid content type for item ${item.id}: ${contentType}`);
              continue;
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            clothingImagesBase64.push(base64);
            itemNames.push(item.name);
          } catch (e) {
            console.error(`Failed to fetch image for item ${item.id}:`, e);
          }
        }
      }

      // Build outfit description from item names if not provided
      if (!finalDescription) {
        finalDescription = itemNames.join(", ");
      }
    }

    // Mode 2: Using a saved outfit image
    if (outfitImageUrl) {
      try {
        const response = await fetch(outfitImageUrl);
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          console.error(`Failed to fetch outfit image: HTTP ${response.status}`);
          return NextResponse.json({ error: "Failed to fetch outfit image" }, { status: 400 });
        }

        if (!contentType.startsWith("image/")) {
          console.error(`Invalid content type for outfit: ${contentType}`);
          return NextResponse.json({ error: "Invalid outfit image format" }, { status: 400 });
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        clothingImagesBase64.push(base64);
      } catch (e) {
        console.error("Failed to fetch outfit image:", e);
        return NextResponse.json({ error: "Failed to load outfit image" }, { status: 400 });
      }
    }

    if (clothingImagesBase64.length === 0) {
      return NextResponse.json(
        { error: "Could not load any clothing images. Please check your selection." },
        { status: 400 }
      );
    }

    // Generate try-on image
    const result = await generateTryOnImage({
      userPhotoBase64,
      outfitDescription: finalDescription,
      clothingImagesBase64,
    });

    // Upload generated image to Supabase Storage
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
