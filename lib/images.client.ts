/**
 * Client-side image utilities
 * Uses FileReader and Canvas (works in browser, not Node.js)
 */

/** Max dimension for AI processing */
const MAX_DIMENSION = 1280;
/** JPEG quality for compression */
const JPEG_QUALITY = 0.88;

/**
 * Compress an image using Canvas API (client-side)
 * Resizes large images and converts to JPEG for smaller payload
 */
export async function compressImageClient(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        // Draw to canvas at reduced size
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed JPEG
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const compressed = dataUrl.split(",")[1];
        resolve(compressed);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

/**
 * Convert a URL to base64 string (client-side only)
 * Handles edge cases like malformed URLs and iOS Safari quirks
 */
export async function urlToBase64(url: string): Promise<string> {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid URL provided");
  }

  // Ensure URL is properly formatted (iOS Safari is strict about URL validation)
  let sanitizedUrl: string;
  try {
    // Use URL constructor to validate and normalize the URL
    const urlObj = new URL(url);
    sanitizedUrl = urlObj.href;
  } catch {
    // If URL is relative or blob URL, use as-is
    sanitizedUrl = url;
  }

  const response = await fetch(sanitizedUrl, {
    // Avoid cache issues that can cause problems on mobile
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
