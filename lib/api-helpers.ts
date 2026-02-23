import { NextResponse } from "next/server";

/**
 * Shared error handler for AI generation API routes.
 * Standardizes logging, handles rate limits (429), server overloads (503),
 * and provides user-friendly error messages to the frontend.
 */
export function handleAIGenerationError(error: unknown, context: string) {
  console.error(`Generate ${context} error:`, error);

  const message = error instanceof Error ? error.message : `Failed to generate ${context}`;
  const errorWithStatus = error as { status?: number };

  // Handle Rate Limits (429)
  if (errorWithStatus.status === 429 || message.includes("429") || message.includes("quota")) {
    return NextResponse.json(
      { error: "Rate limit reached. Please wait 30 seconds and try again." },
      { status: 429 }
    );
  }

  // Sanitize 503/50x or other unhandled errors so the frontend shows a nice message
  const isServiceUnavailable = errorWithStatus.status === 503 || message.includes("503") || message.includes("unavailable");
  const friendlyMessage = isServiceUnavailable 
    ? "Our AI styling engine is currently experiencing high demand. Please try again in a few moments."
    : `Failed to generate ${context}. Please try again.`;

  return NextResponse.json(
    { error: friendlyMessage },
    { status: isServiceUnavailable ? 503 : 500 }
  );
}
