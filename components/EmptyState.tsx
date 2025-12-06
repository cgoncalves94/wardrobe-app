import Link from "next/link";

type EmptyStateSize = "sm" | "md" | "lg";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
  };
  size?: EmptyStateSize;
}

const sizeConfig = {
  sm: {
    container: "py-6 px-4",
    iconWrapper: "w-10 h-10 mb-3 rounded-lg",
    title: "text-sm font-medium mb-1",
    description: "text-xs mb-3",
    button: "px-3 py-1.5 rounded-md text-xs gap-1.5",
  },
  md: {
    container: "py-8",
    iconWrapper: "w-14 h-14 mb-4 rounded-xl",
    title: "text-sm font-medium mb-1",
    description: "text-xs mb-4 max-w-[200px]",
    button: "px-4 py-2 rounded-lg text-xs gap-1.5",
  },
  lg: {
    container: "py-12",
    iconWrapper: "w-16 h-16 mb-5 rounded-2xl",
    title: "text-lg font-medium mb-2",
    description: "text-sm mb-6 max-w-sm",
    button: "px-5 py-2.5 rounded-lg text-sm gap-2",
  },
};

/**
 * Reusable empty state component with consistent styling across the app.
 * Supports three sizes: sm (dropdowns), md (tabs/cards), lg (full sections)
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
}: EmptyStateProps) {
  const config = sizeConfig[size];

  return (
    <div className={`${config.container} flex flex-col items-center justify-center text-center`}>
      <div
        className={`${config.iconWrapper} bg-foreground/5 border border-border/30 flex items-center justify-center`}
      >
        {icon}
      </div>
      <h3 className={config.title}>{title}</h3>
      <p className={`${config.description} text-muted-foreground`}>{description}</p>
      {action && (
        <Link
          href={action.href}
          className={`${config.button} inline-flex items-center bg-foreground text-background font-medium hover:opacity-90 transition-opacity`}
        >
          {action.icon}
          {action.label}
        </Link>
      )}
    </div>
  );
}
