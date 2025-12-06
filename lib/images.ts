/**
 * Fetch an image from URL and convert to base64 (server-side)
 * @param url - Image URL to fetch
 * @param contextLabel - Optional label for error logging
 */
export async function fetchImageAsBase64(url: string, contextLabel?: string): Promise<string | null> {
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
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (error) {
    console.error(`Failed to fetch image${contextLabel ? ` for ${contextLabel}` : ""}:`, error);
    return null;
  }
}
