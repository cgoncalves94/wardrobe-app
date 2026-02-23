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

      // Check if it's a rate limit (429) or server error (50x)
      const isRetryable = sdkError.status === 429 ||
                    (sdkError.status && sdkError.status >= 500) ||
                    lastError.message?.includes("429") ||
                    lastError.message?.includes("503") ||
                    lastError.message?.includes("500") ||
                    lastError.message?.includes("502") ||
                    lastError.message?.includes("504") ||
                    lastError.message?.includes("quota") ||
                    lastError.message?.includes("RESOURCE_EXHAUSTED") ||
                    lastError.message?.includes("unavailable");

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Extract retry delay from error if available, otherwise use exponential backoff
      let delay = initialDelay * Math.pow(2, attempt);
      const retryMatch = lastError.message?.match(/retry in (\d+(?:\.\d+)?)/i);
      if (retryMatch) {
        delay = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1000; // Add 1s buffer
      }

      console.log(`Retryable error (${sdkError.status || "network"}). Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Execute a Gemini request with automatic fallback to secondary models if the primary fails.
 * Wraps the execution with our existing retry logic for each model attempt.
 */
async function withFallback<T>(
  executionFn: (modelName: string) => Promise<T>,
  models: string[] = ["gemini-3-pro-image-preview", "gemini-2.5-flash-image"]
): Promise<T> {
  let lastError: Error | undefined;

  for (const model of models) {
    try {
      console.log(`[Gemini] Attempting generation with model: ${model}`);
      // Apply the existing retry logic to EACH model attempt
      return await withRetry(() => executionFn(model));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[Gemini] Model ${model} failed:`, lastError.message);
      // Continue to the next model in the fallback chain
    }
  }

  // If we exhausted all models, throw the last error
  throw lastError || new Error("All Gemini models failed");
}

export type { OutfitStyle, MannequinGender } from "./types";

/** Options for generating outfit from wardrobe items */
interface GenerateOutfitOptions {
  headwearImageBase64?: string;
  topImageBase64?: string;
  outerwearImageBase64?: string;
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
  category: string; // e.g., "Headwear", "Top", "Outerwear", "Bottom", "Full Body", "Footwear", "Accessories"
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
  const { headwearImageBase64, topImageBase64, outerwearImageBase64, bottomImageBase64, fullBodyImageBase64, footwearImageBase64, accessoryImagesBase64, useMannequin = false, mannequinGender = "female" } = options;

  // Build the content parts - images first, then prompt (per Google best practices)
  const parts: any[] = [];
  let itemCount = 0;

  const hasFullBody = Boolean(fullBodyImageBase64);
  const hasTop = Boolean(topImageBase64);
  const hasOuterwear = Boolean(outerwearImageBase64);
  const hasBottom = Boolean(bottomImageBase64);

  if (headwearImageBase64) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: headwearImageBase64 } });
    itemCount++;
  }
  if (topImageBase64) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: topImageBase64 } });
    itemCount++;
  }
  if (outerwearImageBase64) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: outerwearImageBase64 } });
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
    ? `Create an image: A vertical 3:4 portrait fashion photograph shot with an 85mm lens. A retail store display mannequin with a smooth featureless oval head - solid matte gray plastic/fiberglass form, NO human skin anywhere - stands centered against a clean white studio backdrop. The mannequin has a ${mannequinGender} body shape. Capture full body from head to feet. Soft diffused studio lighting.

IMPORTANT: The ${itemCount} reference images may show clothing on human models - IGNORE any human skin/body in those images. Extract ONLY the garments themselves and place them on the gray plastic mannequin. The mannequin must have uniform gray plastic skin on ALL visible body parts (arms, legs, neck, head) - no flesh tones whatsoever.

Each garment must preserve its exact original appearance - maintaining identical neckline, collar style, sleeve length, colors, patterns and fabric texture. If a full-body garment is included, treat it as the primary piece; layer any provided tops or outerwear naturally. Only include the garments shown in the references, nothing additional.`

    : `Create an image: A professional overhead flat-lay photograph shot with a 35mm lens looking straight down at a white marble surface. Soft natural window light from the left.

${flatLayLayout}

${flatLayProportions}

Each garment preserves its exact appearance from the reference. Every piece laid completely flat and fully spread open. Only these ${itemCount} garments, nothing additional.`;

  parts.push({ text: prompt });

  // Call Gemini API with fallback and retry logic
  const response = await withFallback((model) =>
    ai.models.generateContent({
      model: model,
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
    ? `Create an image: A retail store display mannequin with a smooth featureless oval head - solid matte gray plastic/fiberglass form, NO human skin texture - against a white studio backdrop. The mannequin has a ${mannequinGender} body shape. Full body from head to feet. Soft studio lighting.

Wearing ONLY: ${itemsDescription}. Style: ${styleDescriptions[style]}.

NO extras - no watches, glasses, belts, jewelry, bags, or props unless explicitly requested.`

    : `Create an image: Professional overhead flat-lay photograph on white marble surface. Soft natural lighting.

${mannequinGender === "male" ? "Men's" : "Women's"} clothing. ONLY these items: ${itemsDescription}. Style: ${styleDescriptions[style]}.

IMPORTANT: Every garment must be COMPLETELY UNFOLDED and SPREAD FLAT - NOT FOLDED. Show full garment shape with arms/legs extended outward.

Items arranged top-to-bottom as worn on body. No overlapping.

NO extras unless explicitly requested.`;

  const parts: any[] = [{ text: prompt }];

  // Call Gemini API with fallback and retry logic
  const response = await withFallback((model) =>
    ai.models.generateContent({
      model: model,
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

  // Add unique prefix to bust implicit caching (Gemini caches requests with same prefix)
  const cacheBreaker = `[Request ID: ${Date.now()}-${Math.random().toString(36).slice(2, 8)}]\n\n`;

  if (mode === "outfits" && outfitImageBase64) {
    // OUTFIT MODE: Replace the entire outfit
    // Person photo FIRST so Gemini memorizes face before seeing outfit
    parts.push({ text: `${cacheBreaker}REFERENCE PERSON (preserve this exact identity):` });
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: userPhotoBase64,
      },
    });

    parts.push({ text: "OUTFIT TO APPLY:" });
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: outfitImageBase64,
      },
    });

    prompt = `Virtual try-on: Extract the CLOTHING from the second image and apply it to the person in the first image.

The second image shows clothes on a mannequin/model - IGNORE the mannequin's pose entirely. Only use it to see what garments to apply.

PRESERVE FROM FIRST IMAGE:
- Exact same person (face, facial features, skin tone, hair)
- Exact same pose and body position
- Exact same background and environment
- Same framing and composition

TAKE FROM SECOND IMAGE:
- Only the clothing/garments (colors, patterns, style)
- Adapt the clothes to fit the person's actual pose

The clothes must naturally conform to how the person is standing/positioned in the original photo. Do not change their pose to match the mannequin.

CRITICAL: If multiple people in photo, focus on main/centered person only and remove others. Same resolution and aspect ratio. No cropping or rotating.`;

    parts.push({ text: prompt });
  } else if (clothingItems?.length) {
    // ITEMS MODE: Replace only specific clothing categories
    // Person photo FIRST so Gemini memorizes face before seeing clothing items
    parts.push({ text: `${cacheBreaker}REFERENCE PERSON (preserve this exact identity):` });
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: userPhotoBase64,
      },
    });

    // Add clothing images with category labels
    for (const item of clothingItems) {
      parts.push({ text: `${item.category.toUpperCase()} ITEM TO APPLY:` });
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: item.base64,
        },
      });
    }

    const categories = clothingItems.map(item => item.category);
    const hasFullBody = categories.includes("Full Body");

    // Build smart replacement instructions based on categories
    let replacementInstructions: string;
    if (hasFullBody) {
      const fullBodyDesc = getRootPromptDescription("Full Body");
      const otherCategories = categories.filter(c => c !== "Full Body");
      if (otherCategories.length > 0) {
        const otherDescriptions = otherCategories.map(c => getRootPromptDescription(c));
        replacementInstructions = `Replace the person's top and bottom with the ${fullBodyDesc}, and also replace their ${otherDescriptions.join(" and ")}.`;
      } else {
        replacementInstructions = `Replace the person's top and bottom with the ${fullBodyDesc}.`;
      }
    } else {
      const categoryDescriptions = categories.map(c => getRootPromptDescription(c));
      const hasTop = categories.includes("Top");
      const hasOuterwear = categories.includes("Outerwear");

      const removeOuterwearNote = hasTop && !hasOuterwear
        ? " Remove any jacket or outerwear layer so the new top is fully visible."
        : "";

      replacementInstructions = `Replace ONLY the person's ${categoryDescriptions.join(" and ")} with the items shown. Keep all OTHER clothing exactly as in the original.${removeOuterwearNote}`;
    }

    prompt = `Virtual try-on: ${replacementInstructions}

IDENTITY PRESERVED: The output must show the exact same person from the first image - same face, same facial features, same skin tone, same hair. This is the same individual, not a different model.

Keep their exact pose and the original background. Match lighting and shadows naturally.

CRITICAL: If there are multiple people, focus ONLY on the main/centered person and remove others. Output same resolution and aspect ratio. Do not crop or rotate.`;

    parts.push({ text: prompt });
  } else {
    throw new Error("No clothing items or outfit provided");
  }

  // Debug: log total payload size
  const totalBase64Size = parts
    .filter((p: any) => p.inlineData?.data)
    .reduce((sum: number, p: any) => sum + (p.inlineData?.data?.length || 0), 0);
  console.log(`[Gemini][TryOn] Total base64 size: ${(totalBase64Size / 1024 / 1024).toFixed(2)}MB, parts: ${parts.length}`);

  // Call Gemini API with fallback and retry logic
  const response = await withFallback((model) =>
    ai.models.generateContent({
      model: model,
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
