"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export default function LogoutButton({ className }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("nav");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

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
