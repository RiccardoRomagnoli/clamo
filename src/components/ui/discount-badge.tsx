import React from "react";

interface DiscountBadgeProps {
  percentage: number;
  durationText?: string; // e.g. "For 2 months"
  className?: string;
  variant?: 'pill' | 'cloud';
}

/**
 * A catchy pill-shaped badge that displays the active introductory discount.
 */
export const DiscountBadge: React.FC<DiscountBadgeProps> = ({
  percentage,
  durationText = "",
  className = "",
  variant = "cloud",
}) => (
  <div
    aria-label={`${percentage}% off for 2 months`}
    className={`inline-flex items-center gap-2 px-4 py-1.5 text-white text-xs font-bold drop-shadow-md
      ${className}
      ${variant === 'pill'
        ? 'rounded-full bg-gradient-to-r from-green-500 to-green-400'
        : 'bg-gradient-to-r from-green-500 to-green-400 clip-path-[polygon(0_0,100%_0,100%_80%,92%_100%,8%_100%,0_80%)]'}
    `}
    style={{
      filter: 'drop-shadow(0 2px 8px rgba(34,197,94,0.35))',
      backgroundSize: '200% 100%',
      animation: 'shimmer 2s infinite',
    }}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4 text-yellow-200 drop-shadow"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.455a1 1 0 00-.364 1.118l1.287 3.955c.3.922-.755 1.688-1.54 1.118l-3.371-2.455a1 1 0 00-1.175 0l-3.37 2.455c-.786.57-1.84-.196-1.54-1.118l1.287-3.955a1 1 0 00-.364-1.118L2.074 9.382c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.955z" />
    </svg>
    <span className="tracking-tight text-sm md:text-base">{percentage}% OFF</span>
    {durationText && (
      <span className="text-[10px] md:text-xs font-semibold opacity-90">{durationText}</span>
    )}
  </div>
); 