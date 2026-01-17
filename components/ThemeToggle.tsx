"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Props = {
  /** Show text label next to icon */
  showLabel?: boolean;
  label?: string;
};

/**
 * Toggle between light and dark themes
 */
export default function ThemeToggle({ showLabel = false, label }: Props) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className={`flex items-center gap-2 ${showLabel ? "px-3 py-2" : "p-2"}`}>
        <div className="w-5 h-5" />
        {showLabel && <span className="text-sm">{label}</span>}
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-2 rounded-lg hover:bg-secondary transition-colors ${
        showLabel ? "w-full px-3 py-2.5 text-sm" : "p-2"
      }`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      {showLabel && <span>{label}</span>}
    </button>
  );
}
