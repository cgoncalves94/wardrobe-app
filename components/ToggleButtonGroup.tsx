"use client";

import { ReactNode } from "react";

interface ToggleOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface ToggleButtonGroupProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  stretch?: boolean;
}

export default function ToggleButtonGroup<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  size = "sm",
  stretch = false,
}: ToggleButtonGroupProps<T>) {
  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-xs gap-1",
    md: "px-3 py-2 text-xs gap-1.5",
  };

  return (
    <div
      className={`flex items-center p-0.5 bg-secondary/60 rounded-lg ${
        stretch ? "flex-1" : ""
      }`}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`flex items-center justify-center rounded-md font-medium transition-all ${
              sizeClasses[size]
            } ${stretch ? "flex-1" : ""} ${
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            } ${disabled ? "opacity-60" : ""}`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
