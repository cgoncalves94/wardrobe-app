/**
 * Client-side image utilities
 * Uses FileReader (works in browser, not Node.js)
 */

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
