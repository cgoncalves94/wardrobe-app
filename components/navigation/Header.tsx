"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Settings, LogOut } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LogoutButton from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

type Props = {
  currentLocale: Locale;
};

export default function Header({ currentLocale }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[1400px] flex items-center justify-between px-4 sm:px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
            <svg
              className="w-4 h-4 text-background"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
          <span className="text-base font-medium">{t("common.appName")}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {t("nav.home")}
          </Link>
          <Link
            href="/items"
            className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {t("nav.items")}
          </Link>
          <Link
            href="/outfits"
            className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {t("nav.outfits")}
          </Link>
          <Link
            href="/categories"
            className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {t("nav.categories")}
          </Link>
          <Link
            href="/items/new"
            className="ml-3 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t("nav.addItem")}
          </Link>
          <div className="ml-4 pl-4 border-l border-border/50 flex items-center gap-3">
            <LanguageSwitcher currentLocale={currentLocale} />
            <LogoutButton />
          </div>
        </nav>

        {/* Mobile Settings Dropdown */}
        <div className="lg:hidden relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label={t("nav.settings")}
          >
            <Settings className="w-5 h-5" />
          </button>

          {settingsOpen && (
            <div className="absolute right-0 top-full mt-2 py-1 rounded-xl border border-border bg-background shadow-lg">
              <div className="px-3 py-2.5">
                <LanguageSwitcher currentLocale={currentLocale} />
              </div>

              <div className="border-t border-border" />

              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-3 py-2.5 flex items-center gap-2 text-sm hover:bg-secondary transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t("nav.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
