import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "~/utils/tailwind";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "muted" | "white" | "blue";
  className?: string;
  label?: string;
  withLabel?: boolean;
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  variant = "primary",
  className = "",
  label = "Loading...",
  withLabel = false,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const variantClasses = {
    primary: "border-primary",
    muted: "border-muted-foreground",
    white: "border-white",
    blue: "border-blue-600",
  };

  // Using border-based spinner similar to the one in GrammarActivity
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-b-2",
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
      {withLabel && <p>{label}</p>}
    </div>
  );
};

// For compatibility with components using Loader2
export const IconLoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  variant = "primary",
  className = "",
  label = "Loading...",
  withLabel = false,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const variantClasses = {
    primary: "text-primary",
    muted: "text-muted-foreground",
    white: "text-white",
    blue: "text-blue-600",
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <Loader2
        className={cn(
          "animate-spin",
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
      {withLabel && <p>{label}</p>}
    </div>
  );
}; 