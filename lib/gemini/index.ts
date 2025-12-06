/**
 * Server-only module - do not import in client components
 */
import { GoogleGenAI } from "@google/genai";
import type { OutfitStyle, MannequinGender } from "./types";
import { getRootPromptDescription } from "@/lib/categories";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/** SDK error with optional HTTP status code */
interface SdkError extends Error {
  status?: number;
}

/**
 * Retry helper with exponential backoff for 429 rate limit errors
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 8000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const sdkError = error as SdkError;

      // Check if it's a rate limit error (429)
      const is429 = sdkError.status === 429 ||
                    lastError.message?.includes("429") ||
                    lastError.message?.includes("quota") ||
                    lastError.message?.includes("RESOURCE_EXHAUSTED");

      if (!is429 || attempt === maxRetries) {
        throw lastError;
      }

      // Extract retry delay from error if available, otherwise use exponential backoff
      let delay = initialDelay * Math.pow(2, attempt);
      const retryMatch = lastError.message?.match(/retry in (\d+(?:\.\d+)?)/i);
      if (retryMatch) {
        delay = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1000; // Add 1s buffer
      }

      console.log(`Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export type { OutfitStyle, MannequinGender } from "./types";

/** Options for generating outfit from wardrobe items */
interface GenerateOutfitOptions {
  headwearImageBase64?: string;
  topImageBase64?: string;
  bottomImageBase64?: string;
  fullBodyImageBase64?: string;
  footwearImageBase64?: string;
  accessoryImagesBase64?: string[];
  useMannequin?: boolean;
  mannequinGender?: MannequinGender;
}

type TryOnMode = "items" | "outfits";

/** Clothing item with its category for smarter prompts */
interface ClothingItem {
  base64: string;
  category: string; // e.g., "Headwear", "Top", "Bottom", "Full Body", "Footwear", "Accessories"
}

/** Options for virtual try-on generation */
interface TryOnOptions {
  mode: TryOnMode;
  userPhotoBase64: string;
  /** For items mode: individual clothing with categories */
  clothingItems?: ClothingItem[];
  /** For outfits mode: single outfit image (replaces everything) */
  outfitImageBase64?: string;
}

/**
 * Generate a styled outfit composition from clothing items
 */
export async function generateOutfitImage(options: GenerateOutfitOptions): Promise<{
  imageBase64: string;
  prompt: string;
}> {
  const { headwearImageBase64, topImageBase64, bottomImageBase64, fullBodyImageBase64, footwearImageBase64, accessoryImagesBase64, useMannequin = false, mannequinGender = "female" } = options;

  // Build the content parts - images first, then prompt (per Google best practices)
  const parts: any[] = [];
  let itemCount = 0;

  const hasFullBody = Boolean(fullBodyImageBase64);
  const hasTop = Boolean(topImageBase64);
  const hasBottom = Boolean(bottomImageBase64);

  if (headwearImageBase64) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: headwearImageBase64 } });
    itemCount++;
  }
  if (topImageBase64) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: topImageBase64 } });
    itemCount++;
  }
  if (bottomImageBase64) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: bottomImageBase64 } });
    itemCount++;
  }
  if (fullBodyImageBase64) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: fullBodyImageBase64 } });
    itemCount++;
  }
  if (footwearImageBase64) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: footwearImageBase64 } });
    itemCount++;
  }
  if (accessoryImagesBase64?.length) {
    for (const accessory of accessoryImagesBase64) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: accessory } });
      itemCount++;
    }
  }

  // Narrative prompt following Google's best practices:
  // - Start with "Create an image:"
  // - Use photographer language (lens, angle, lighting)
  // - Use "these exact garments" for fidelity
  // - Describe scene narratively, not as bullet points
  const flatLayLayout = (() => {
    if (hasFullBody) {
      return `Arrange these exact ${itemCount} garments from the reference images in a clean, non-overlapping layout. Place the full-body garment (dress/jumpsuit/romper) centered as the main piece. If tops or outer layers are provided, place them neatly above or slightly offset. Position shoes and accessories to the SIDE of the main garment (not below it) to avoid overlap. Leave clear space between all items.`;
    }
    if (hasTop && hasBottom) {
      return `Arrange these exact ${itemCount} garments from the reference images in a clean, non-overlapping layout. Place the top garment at top center, the bottom garment (pants/skirt/shorts) directly below it. Position shoes and accessories to the SIDE of the main garments (not below the bottom) to avoid overlap. Leave clear space between all items.`;
    }
    if (hasTop && !hasBottom) {
      return `Arrange these exact ${itemCount} garments from the reference images in a clean, non-overlapping layout. Place the top garment centered as the main piece. Position shoes and accessories to the SIDE of the top to avoid overlap. Leave clear space between all items.`;
    }
    if (!hasTop && hasBottom) {
      return `Arrange these exact ${itemCount} garments from the reference images in a clean, non-overlapping layout. Place the bottom garment centered as the main piece. Position shoes and accessories to the SIDE of the bottom to avoid overlap. Leave clear space between all items.`;
    }
    return `Arrange these exact ${itemCount} garments from the reference images in a clean, non-overlapping layout. Position shoes and accessories to the SIDE of any main garments. Leave clear space between all items.`;
  })();

  const flatLayProportions = (() => {
    if (hasFullBody) {
      return "PROPORTIONS: Size items realistically for the same adult - full-body garment about 2.5-3x the shoe length; shoes small; accessories scaled naturally.";
    }
    if (hasTop && hasBottom) {
      return "PROPORTIONS: Size all items realistically for the same adult - bottom about 3x taller than the top, shoes about 1/4 the bottom length; accessories scaled naturally.";
    }
    if (hasTop && !hasBottom) {
      return "PROPORTIONS: Size items realistically for the same adult - top sized naturally; shoes about half the top length; accessories scaled naturally.";
    }
    if (!hasTop && hasBottom) {
      return "PROPORTIONS: Size items realistically for the same adult - bottom full-length; shoes about 1/4 the bottom length; accessories scaled naturally.";
    }
    return "PROPORTIONS: Scale all items naturally to adult size; shoes remain small relative to garments.";
  })();

  const prompt = useMannequin
    ? `Create an image: A vertical 3:4 portrait fashion photograph shot with an 85mm lens. A ${mannequinGender} headless gray mannequin stands centered against a clean white studio backdrop, wearing these exact ${itemCount} garments from the reference images above. Capture full body from shoulders to feet. Soft diffused studio lighting. Each garment must preserve its exact original appearance from the reference - maintaining identical neckline, collar style, sleeve length, colors, patterns and fabric texture. If a full-body garment is included, treat it as the primary piece; layer any provided tops or outerwear naturally. Only include the garments shown in the references, nothing additional.`

    : `Create an image: A professional overhead flat-lay photograph shot with a 35mm lens looking straight down at a white marble surface. Soft natural window light from the left.

${flatLayLayout}

${flatLayProportions}

Each garment preserves its exact appearance from the reference. Every piece laid completely flat and fully spread open. Only these ${itemCount} garments, nothing additional.`;

  parts.push({ text: prompt });

  // Call Gemini API with retry logic for rate limits
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    })
  );

  // Extract image from response
  const responseParts = response.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find((p: any) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error("Failed to generate outfit image");
  }

  return {
    imageBase64: imagePart.inlineData.data,
    prompt,
  };
}

/** Options for AI Picks text-to-image generation */
interface GenerateFromPromptOptions {
  itemsDescription: string;
  style: OutfitStyle;
  useMannequin?: boolean;
  mannequinGender?: MannequinGender;
}

/**
 * Generate an outfit image from text prompt (AI Picks mode)
 * Pure text-to-image generation without wardrobe items
 */
export async function generateOutfitFromPrompt(options: GenerateFromPromptOptions): Promise<{
  imageBase64: string;
  prompt: string;
}> {
  const { itemsDescription, style, useMannequin = false, mannequinGender = "female" } = options;

  const styleDescriptions: Record<OutfitStyle, string> = {
    casual: "relaxed, everyday look with comfortable vibes",
    formal: "sophisticated, polished, professional appearance",
    "date-night": "romantic, attractive, perfect for a special evening",
    work: "professional yet stylish office appropriate look",
    street: "trendy urban fashion with cool streetwear aesthetics",
    cozy: "warm, comfortable, soft and inviting",
    elegant: "luxurious, refined, high-fashion appearance",
    sporty: "athletic, active lifestyle with performance-ready aesthetics",
  };

  // Build prompt based on display mode (flat-lay vs mannequin)
  // Following Google's best practices: narrative style, photographer language
  // IMPORTANT: Be restrictive - only generate what user explicitly asks for
  const prompt = useMannequin
    ? `Create an image: A ${mannequinGender} headless gray mannequin against a white studio backdrop. Full body from shoulders to feet. Soft studio lighting.

Wearing ONLY: ${itemsDescription}. Style: ${styleDescriptions[style]}.

NO extras - no watches, glasses, belts, jewelry, bags, or props unless explicitly requested.`

    : `Create an image: Professional overhead flat-lay photograph on white marble surface. Soft natural lighting.

${mannequinGender === "male" ? "Men's" : "Women's"} clothing. ONLY these items: ${itemsDescription}. Style: ${styleDescriptions[style]}.

IMPORTANT: Every garment must be COMPLETELY UNFOLDED and SPREAD FLAT - NOT FOLDED. Show full garment shape with arms/legs extended outward.

Items arranged top-to-bottom as worn on body. No overlapping.

NO extras unless explicitly requested.`;

  const parts: any[] = [{ text: prompt }];

  // Call Gemini API with retry logic for rate limits
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    })
  );

  // Extract image from response
  const responseParts = response.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find((p: any) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error("Failed to generate outfit image from prompt");
  }

  return {
    imageBase64: imagePart.inlineData.data,
    prompt,
  };
}

/**
 * Generate a virtual try-on image
 */
export async function generateTryOnImage(options: TryOnOptions): Promise<{
  imageBase64: string;
  prompt: string;
}> {
  const { mode, userPhotoBase64, clothingItems, outfitImageBase64 } = options;

  const parts: any[] = [];
  let prompt: string;

  if (mode === "outfits" && outfitImageBase64) {
    // OUTFIT MODE: Replace the entire outfit
    prompt = `Replace ALL clothing on the person with the complete outfit shown in the first image. The first image shows a full outfit - use it to dress the person completely. Keep the person's face, hair, pose, and background exactly the same. Replace everything they're wearing with this outfit.

Match the lighting and shadows on the new clothes to the original scene. The result should look natural and realistic - clothes should look worn on the body with proper fabric drape and folds, not digitally pasted.

IMPORTANT: Preserve the person's face, skin tone, body shape, and pose EXACTLY. Output the image at the same resolution and aspect ratio as the person's photo. Do not crop, resize, or change the framing.`;

    parts.push({ text: prompt });

    // Add outfit image
    parts.push({ text: "COMPLETE OUTFIT TO WEAR:" });
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: outfitImageBase64,
      },
    });

    // Add person photo
    parts.push({ text: "PERSON TO DRESS:" });
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: userPhotoBase64,
      },
    });
  } else if (clothingItems?.length) {
    // ITEMS MODE: Replace only specific clothing categories
    const categories = clothingItems.map(item => item.category);
    const hasFullBody = categories.includes("Full Body");

    // Build smart replacement instructions based on categories
    let replacementInstructions: string;
    if (hasFullBody) {
      // Full body replaces top + bottom
      const fullBodyDesc = getRootPromptDescription("Full Body");
      const otherCategories = categories.filter(c => c !== "Full Body");
      if (otherCategories.length > 0) {
        const otherDescriptions = otherCategories.map(c => getRootPromptDescription(c));
        replacementInstructions = `Replace the person's top and bottom clothing with the ${fullBodyDesc}, and also replace their ${otherDescriptions.join(" and ")}.`;
      } else {
        replacementInstructions = `Replace the person's top and bottom clothing with the ${fullBodyDesc}.`;
      }
    } else {
      const categoryDescriptions = categories.map(c => getRootPromptDescription(c));
      replacementInstructions = `Replace ONLY the person's ${categoryDescriptions.join(" and ")} with the items shown. Keep all OTHER clothing exactly as it appears in the original photo.`;
    }

    prompt = `${replacementInstructions} Keep the person's face, hair, pose, and background exactly the same.

Match the lighting and shadows on the new clothes to the original scene. The result should look natural and realistic - clothes should look worn on the body with proper fabric drape and folds, not digitally pasted.

IMPORTANT: Preserve the person's face, skin tone, body shape, and pose EXACTLY. Output the image at the same resolution and aspect ratio as the person's photo. Do not crop, resize, or change the framing.`;

    parts.push({ text: prompt });

    // Add clothing images with category labels
    for (const item of clothingItems) {
      parts.push({ text: `${item.category.toUpperCase()} ITEM:` });
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: item.base64,
        },
      });
    }

    // Add person photo
    parts.push({ text: "PERSON TO EDIT:" });
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: userPhotoBase64,
      },
    });
  } else {
    throw new Error("No clothing items or outfit provided");
  }

  // Debug: log total payload size
  const totalBase64Size = parts
    .filter((p: any) => p.inlineData?.data)
    .reduce((sum: number, p: any) => sum + (p.inlineData?.data?.length || 0), 0);
  console.log(`[Gemini][TryOn] Total base64 size: ${(totalBase64Size / 1024 / 1024).toFixed(2)}MB, parts: ${parts.length}`);

  // Call Gemini API with retry logic for rate limits
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    })
  );

  const responseParts = response.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find((p: any) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    // Build a detailed error message
    const finishReason = response.candidates?.[0]?.finishReason;
    const blockReason = (response as any).promptFeedback?.blockReason;
    const candidateCount = response.candidates?.length ?? 0;

    let errorDetail = "Failed to generate try-on image";
    if (blockReason) {
      errorDetail += ` - blocked: ${blockReason}`;
    } else if (finishReason && finishReason !== "STOP") {
      errorDetail += ` - finish reason: ${finishReason}`;
    } else if (candidateCount === 0) {
      errorDetail += " - no candidates returned";
    } else {
      errorDetail += " - response contained no image";
    }

    throw new Error(errorDetail);
  }

  return {
    imageBase64: imagePart.inlineData.data,
    prompt,
  };
}
