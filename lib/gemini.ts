// Server-only module - do not import in client components
import { GoogleGenAI } from "@google/genai";
import type { OutfitStyle, MannequinGender } from "./gemini-types";

// Initialize the Gemini client (server-side only)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Error type for SDK errors with status codes
interface SdkError extends Error {
  status?: number;
}

// Retry helper with exponential backoff for 429 rate limit errors
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

// Re-export type for API routes
export type { OutfitStyle, MannequinGender } from "./gemini-types";

interface GenerateOutfitOptions {
  topImageBase64?: string;
  bottomImageBase64?: string;
  fullBodyImageBase64?: string;
  footwearImageBase64?: string;
  accessoryImagesBase64?: string[];
  style?: OutfitStyle;
  additionalPrompt?: string;
  useMannequin?: boolean;
  mannequinGender?: MannequinGender;
}

interface TryOnOptions {
  userPhotoBase64: string;
  outfitDescription: string;
  clothingImagesBase64?: string[];
}

/**
 * Generate a styled outfit composition from clothing items
 */
export async function generateOutfitImage(options: GenerateOutfitOptions): Promise<{
  imageBase64: string;
  prompt: string;
}> {
  const { topImageBase64, bottomImageBase64, fullBodyImageBase64, footwearImageBase64, accessoryImagesBase64, style = "casual", additionalPrompt, useMannequin = false, mannequinGender = "female" } = options;

  // Build the content parts
  const parts: any[] = [];

  // Add clothing images
  if (topImageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: topImageBase64,
      },
    });
  }

  if (bottomImageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: bottomImageBase64,
      },
    });
  }

  if (fullBodyImageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: fullBodyImageBase64,
      },
    });
  }

  if (footwearImageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: footwearImageBase64,
      },
    });
  }

  if (accessoryImagesBase64?.length) {
    for (const accessory of accessoryImagesBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: accessory,
        },
      });
    }
  }

  // Build the prompt with explicit item descriptions
  const styleDescriptions: Record<OutfitStyle, string> = {
    casual: "relaxed, everyday look with comfortable vibes",
    formal: "sophisticated, polished, professional appearance",
    "date-night": "romantic, attractive, perfect for a special evening",
    work: "professional yet stylish office appropriate look",
    street: "trendy urban fashion with cool streetwear aesthetics",
    cozy: "warm, comfortable, soft and inviting",
    elegant: "luxurious, refined, high-fashion appearance",
  };

  // Build dynamic description of what items were actually provided
  const providedItems: string[] = [];
  if (topImageBase64) providedItems.push("top/shirt");
  if (bottomImageBase64) providedItems.push("bottom/pants");
  if (fullBodyImageBase64) providedItems.push("full body piece/dress");
  if (footwearImageBase64) providedItems.push("footwear/shoes");
  if (accessoryImagesBase64?.length) providedItems.push(`${accessoryImagesBase64.length} accessory item(s)`);

  const itemCount = parts.length;
  const itemList = providedItems.join(", ");

  // Build prompt based on display mode (flat-lay vs mannequin)
  const prompt = useMannequin
    ? `Create a professional fashion product photograph showing clothing on a ${mannequinGender} mannequin. I am providing exactly ${itemCount} clothing item image(s): ${itemList}.

PHOTOGRAPHY STYLE:
- Full-body ${mannequinGender} mannequin (headless, standard retail display style)
- Clean white/light gray studio background
- Front-facing view, straight-on camera angle
- Professional fashion retail photography aesthetic
- Soft, even studio lighting with minimal shadows
- The mannequin should be a neutral gray or white color

MANNEQUIN DISPLAY:
- Clothing naturally draped and fitted on the mannequin
- Show how the outfit would look when worn together
- Mannequin in neutral standing pose
- Full body shot showing all garments from shoulders to feet

CRITICAL RULES:
- Use ONLY the exact ${itemCount} clothing items I provided - nothing more
- If no shoes were provided, mannequin has bare feet or cropped at ankles
- If no accessories were provided, show zero accessories
- The outfit style should feel ${styleDescriptions[style]}
- Standard retail mannequin - NO human features, NO face, NO skin texture
${additionalPrompt ? `\nAdditional notes: ${additionalPrompt}` : ""}

Remember: This is a MANNEQUIN product photo for fashion retail, showing how the outfit looks when worn together.`

    : `Create a professional top-down flat-lay fashion photograph. I am providing exactly ${itemCount} clothing item image(s): ${itemList}.

PHOTOGRAPHY STYLE:
- Camera angle: Directly overhead, bird's eye view looking straight down
- Each garment laid FLAT and SEPARATELY on a clean white marble surface
- Items should NOT overlap or be arranged as if worn on a body/mannequin
- Space between each item (2-3 inches gap)
- Garments neatly folded or spread flat showing their full shape
- Soft natural window light from the left, creating gentle shadows
- Magazine editorial flat-lay aesthetic, like a fashion blogger's Instagram post

ARRANGEMENT:
- Top garments placed in upper portion of frame
- Bottom garments (pants/skirts) placed below with clear separation
- Shoes placed at the bottom if provided
- Each piece clearly visible and distinct from others

CRITICAL RULES:
- Use ONLY the exact ${itemCount} clothing items I provided - nothing more
- If no shoes were provided, do NOT add any footwear
- If no accessories were provided, show zero accessories
- Clean white/light gray background, no props or decorations
- The outfit style should feel ${styleDescriptions[style]}
${additionalPrompt ? `\nAdditional notes: ${additionalPrompt}` : ""}

Remember: This is a FLAT-LAY photo where clothes are laid separately on a surface, NOT styled on an invisible mannequin or body form.`;

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

/**
 * Generate a virtual try-on image
 */
export async function generateTryOnImage(options: TryOnOptions): Promise<{
  imageBase64: string;
  prompt: string;
}> {
  const { userPhotoBase64, outfitDescription, clothingImagesBase64 } = options;

  const parts: any[] = [];

  // Add user photo first
  parts.push({
    inlineData: {
      mimeType: "image/jpeg",
      data: userPhotoBase64,
    },
  });

  // Add clothing images if provided
  if (clothingImagesBase64?.length) {
    for (const clothing of clothingImagesBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: clothing,
        },
      });
    }
  }

  const prompt = `Create a realistic fashion photograph showing the person in the first image wearing the outfit shown in the subsequent images.

Outfit description: ${outfitDescription}

Requirements:
- Keep the person's face, body shape, and features exactly as they appear in the reference photo
- Realistically fit the clothing to the person's body
- Maintain natural lighting and shadows
- The result should look like a real photograph, not a composite
- Professional fashion photography quality
- Full body or 3/4 shot showing the complete outfit
- The clothing should drape and fit naturally on the person

Generate a single photorealistic image of the person wearing the described outfit.`;

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

  const responseParts = response.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find((p: any) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error("Failed to generate try-on image");
  }

  return {
    imageBase64: imagePart.inlineData.data,
    prompt,
  };
}
