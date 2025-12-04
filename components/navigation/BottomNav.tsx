"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, Shirt, Sparkles, FolderOpen, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations();

  const navItems = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/items", icon: Shirt, label: t("nav.items") },
    { href: "/outfits", icon: Sparkles, label: t("nav.outfits") },
    { href: "/categories", icon: FolderOpen, label: t("nav.categories") },
    { href: "/items/new", icon: Plus, label: t("nav.add"), isAdd: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around">
        {navItems.map(({ href, icon: Icon, label, isAdd }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-h-[56px] transition-colors",
                isAdd || isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {isAdd ? (
                <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center -mt-4 shadow-lg">
                  <Icon className="w-5 h-5 text-background" />
                </div>
              ) : (
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
              )}
              <span className={cn("text-[10px] font-medium", isAdd && "mt-0.5")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
