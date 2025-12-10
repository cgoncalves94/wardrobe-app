import sharp from "sharp";

/**
 * Gemini 2.5 Flash Image outputs max 1024px, so sending larger is wasteful.
 * We use 1280px to give the model slightly more detail to work with.
 */
const DEFAULT_MAX_DIMENSION = 1280;
/** High quality JPEG - balances size vs quality */
const DEFAULT_QUALITY = 88;

/** Compress if over 1MB to stay well under 20MB total request limit */
const SIZE_THRESHOLD_BYTES = 1_000_000; // 1MB

/**
 * Compress a base64 image to reduce size for AI processing
 * Only compresses if image exceeds size threshold or dimensions
 * @param base64 - Raw base64 image data (no data URI prefix)
 * @param maxDimension - Max width or height (default 1280px)
 * @param quality - JPEG quality 1-100 (default 88)
 */
export async function compressImageBase64(
  base64: string,
  maxDimension = DEFAULT_MAX_DIMENSION,
  quality = DEFAULT_QUALITY
): Promise<string> {
  const inputBuffer = Buffer.from(base64, "base64");

  // Check if compression is needed
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const needsResize = width > maxDimension || height > maxDimension;
  const needsSizeReduction = inputBuffer.length > SIZE_THRESHOLD_BYTES;
  const hasExifOrientation = metadata.orientation && metadata.orientation !== 1;

  // ALWAYS normalize EXIF orientation for AI processing (fixes mobile photo rotation issues)
  // Skip other processing if image is already small enough and properly oriented
  if (!needsResize && !needsSizeReduction && !hasExifOrientation) {
    return base64;
  }

  const compressed = await sharp(inputBuffer)
    .rotate() // Auto-orient based on EXIF - bakes rotation into pixels & strips EXIF tag
    .resize(maxDimension, maxDimension, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality })
    .toBuffer();

  return compressed.toString("base64");
}

/**
 * Fetch an image from URL and convert to base64 (server-side)
 * @param url - Image URL to fetch
 * @param contextLabel - Optional label for error logging
 * @param compress - Whether to compress the image for AI processing (default false)
 */
export async function fetchImageAsBase64(
  url: string,
  contextLabel?: string,
  compress = false
): Promise<string | null> {
  try {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      console.error(`Failed to fetch image${contextLabel ? ` for ${contextLabel}` : ""}: HTTP ${response.status}`);
      return null;
    }

    if (!contentType.startsWith("image/")) {
      console.error(`Invalid content type${contextLabel ? ` for ${contextLabel}` : ""}: ${contentType}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    if (compress) {
      return compressImageBase64(base64);
    }

    return base64;
  } catch (error) {
    console.error(`Failed to fetch image${contextLabel ? ` for ${contextLabel}` : ""}:`, error);
    return null;
  }
}
