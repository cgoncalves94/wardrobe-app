"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";
import LoginLanguageSwitcher from "@/components/LoginLanguageSwitcher";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      {/* Left - Visual */}
      <div className="hidden lg:flex relative bg-neutral-950 overflow-hidden">
        {/* Subtle gradient */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-neutral-800/40 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-neutral-700/30 rounded-full blur-[120px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
              <svg className="w-5 h-5 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl xl:text-6xl text-white font-medium leading-tight tracking-tight">
              {t("heroTitle")}
              <br />
              <span className="text-neutral-400">{t("heroTitleAccent")}</span>
            </h1>
            <p className="text-neutral-500 text-lg max-w-md leading-relaxed">
              {t("heroDescription")}
            </p>
          </div>

          <p className="text-neutral-700 text-sm">
            {tCommon("appName")}
          </p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex items-center justify-center p-8 bg-white dark:bg-neutral-950 relative">
        <div className="absolute top-6 right-6">
          <LoginLanguageSwitcher />
        </div>

        <div className="w-full max-w-sm space-y-8 animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center">
              <svg className="w-4 h-4 text-white dark:text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <span className="text-lg font-medium">{tCommon("appName")}</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">{t("welcomeBack")}</h2>
            <p className="text-muted-foreground">
              {t("signInDescription")}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-shadow"
                placeholder={t("emailPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {t("password")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-shadow"
                placeholder={t("passwordPlaceholder")}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-foreground text-background font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("signingIn")}
                </>
              ) : (
                <>
                  {t("continue")}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t("personalWardrobe")}
          </p>
        </div>
      </div>
    </div>
  );
}
