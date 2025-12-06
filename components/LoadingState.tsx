"use client";

import { Sparkles } from "lucide-react";

interface LoadingStateProps {
  message: string;
}

/**
 * Centered loading indicator with customizable message
 */
export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-foreground/10 to-foreground/5 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-foreground/50 animate-pulse" />
        </div>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}
