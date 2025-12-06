import { Lock } from "lucide-react";

type Props = {
  label: string;
};

/**
 * Badge overlay indicating a Pro-only feature
 */
export default function ProBadge({ label }: Props) {
  return (
    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-foreground text-background text-xs font-medium">
      <Lock className="w-3 h-3" />
      {label}
    </div>
  );
}
