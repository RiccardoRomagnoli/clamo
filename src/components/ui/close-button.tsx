"use client";

import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/utils/tailwind";

interface BaseCloseButtonProps {
  onClose: () => void;
  isDisabled?: boolean;
  className?: string;
}

interface ModalCloseButtonProps extends BaseCloseButtonProps {
  position?: 'absolute' | 'static';
}

/**
 * ModalCloseButton - An X button used for closing modals
 */
export const ModalCloseButton = ({
  onClose,
  isDisabled = false,
  className,
  position = 'absolute',
}: ModalCloseButtonProps) => {
  return (
    <Button
      variant="ghost"
      className={cn(
        "z-10 rounded-full text-gray-600 h-8 w-8 p-0 flex items-center justify-center",
        position === 'absolute' && "absolute right-4 top-4",
        isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-100",
        "focus:outline-none focus:ring-0",
        className
      )}
      onClick={() => !isDisabled && onClose()}
      disabled={isDisabled}
    >
      <X className="h-4 w-4" />
    </Button>
  );
};

interface PageCloseButtonProps extends BaseCloseButtonProps {
  isDone?: boolean;
  isReview?: boolean;
}

/**
 * PageCloseButton - A text button used for closing full pages
 */
export const PageCloseButton = ({
  onClose,
  isDisabled = false,
  isDone = false,
  isReview = false,
  className,
}: PageCloseButtonProps) => {
  return (
    <Button
      variant="outline"
      onClick={() => !isDisabled && onClose()}
      disabled={isDisabled}
      className={cn(
        "shrink-0",
        {
          "bg-green-600 hover:bg-green-700": isDone,
          "bg-red-600 hover:bg-red-700": !isDone && !isReview,
        },
        "text-white hover:text-white border-none",
        className
      )}
    >
      {isReview ? "Back to Dashboard" : isDone ? "Done" : "Close"}
    </Button>
  );
}; 