"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/use-logout";

type Props = {
  className?: string;
};

export default function LogoutButton({ className }: Props) {
  const t = useTranslations("nav");
  const handleLogout = useLogout();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      <LogOut className="w-4 h-4 mr-1" />
      <span className="hidden sm:inline">{t("logout")}</span>
    </Button>
  );
}
