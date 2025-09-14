'use client';

import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '~/utils/tailwind';
import { Popover, PopoverTrigger, PopoverContent } from '~/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '~/components/ui/command';

/**
 * Interface describing a single language option that the user can pick.
 */
export interface LanguageOption {
  /** The internal value that will be stored (usually matches the label). */
  value: string;
  /** Human-readable label shown in the UI. */
  label: string;
}

interface LanguageSelectProps {
  /** Array of available language options. */
  options: LanguageOption[];
  /** Currently selected value. */
  value: string;
  /** Callback invoked when the user picks a new value. */
  onChange: (value: string) => void;
  /** Placeholder shown when no value is selected. */
  placeholder?: string;
  /** Optional external label shown above the input (useful for forms). */
  label?: string;
  /** Additional CSS classes applied to the wrapper element. */
  className?: string;
  /** When `true` the selector appears in a compact/condensed style. */
  compact?: boolean;
}

/**
 * A searchable language selector built with Radix Popover, cmdk and shadcn-ui
 * primitives. The implementation purposefully mirrors the look & feel of the
 * TimezoneSelector component for a consistent UX across the application.
 */
export function LanguageSelect({
  options,
  value,
  onChange,
  placeholder = 'Select language',
  label,
  className,
  compact = false,
}: LanguageSelectProps) {
  const [open, setOpen] = useState(false);

  // Memoised label for the currently selected option to avoid unnecessary look-ups.
  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === value)?.label ?? '';
  }, [options, value]);

  const displayText = selectedLabel || placeholder;

  return (
    <div className={className}>
      {label && !compact && (
        <label className="mb-1 block text-sm font-medium">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            className={cn(
              'flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              compact && 'h-8 px-2 py-1 text-sm',
            )}
          >
            <span className="truncate">{displayText}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[250px] p-0"
          align="start"
          sideOffset={4}
          style={{ zIndex: 10000 }}
        >
          <Command>
            <CommandInput placeholder="Search language..." />
            <CommandList
              className="max-h-[300px] overflow-y-auto"
              onWheel={(e) => e.stopPropagation()}
            >
              <CommandEmpty>No languages found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      onChange(currentValue);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4 opacity-0',
                        value === option.value && 'opacity-100',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
} 