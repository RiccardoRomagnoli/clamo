import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { countryCodes } from '~/utils/common/country-codes';
import { cn } from '~/utils/tailwind';
import { Search } from 'lucide-react';

export interface PhoneNumberInputProps {
  id?: string;
  label: string;
  value?: string;                // stored as "+<dialCode><localNumber>"
  onChange: (value: string) => void;
  helperText?: string;
  required?: boolean;
  className?: string;
}

/**
 * No default dial code. An empty string represents an un-selected country code.
 */
const DEFAULT_DIAL = '';

/* -------------------------------------------------------- */
/* helpers                                                  */
/* -------------------------------------------------------- */
const parsePhone = (raw: string) => {
  if (!raw) return { dialCode: DEFAULT_DIAL, local: '' };

  const found = countryCodes.find((c) => raw.startsWith(c.dial_code));

  // If we cannot match a dial code we treat it as "no code selected".
  if (!found) {
    return { dialCode: '', local: raw.replace(/\D/g, '') };
  }

  const local = raw.slice(found.dial_code.length).replace(/\D/g, '');
  return { dialCode: found.dial_code, local };
};

/* -------------------------------------------------------- */
/* component                                                */
/* -------------------------------------------------------- */
export const PhoneNumberInput = ({
  id,
  label,
  value = '',
  onChange,
  helperText,
  required = false,
  className = '',
}: PhoneNumberInputProps) => {
  /* ---------- local state ---------- */
  const [{ dialCode, local }, setPhone] = useState(() => parsePhone(value));

  // Only update local state if value prop changes from outside (not from local edits)
  useEffect(() => {
    const parsed = parsePhone(value);
    const formatted = `${parsed.dialCode}${parsed.local}`;
    // Only update if the incoming value is different from the current formatted value
    if (value !== '' && formatted !== `${dialCode}${local}`) {
      setPhone(parsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  /* search & open state for dial-code dropdown */
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  /* stable id when none is provided */
  const generatedId = useRef(
    `phone-${Math.random().toString(36).slice(2, 9)}`
  ).current;
  const inputId = id ?? generatedId;

  /* ---------- derived full value ---------- */
  const formatted = useMemo(() => {
    if (!dialCode || !local) return '';
    return `${dialCode}${local}`;
  }, [dialCode, local]);

  /* ---------- propagate upwards only when needed ---------- */
  const isNumberEntered = local !== '';
  const isDialSelected = dialCode !== '';
  const isNumberValid = /^\d{4,15}$/.test(local);

  // Valid when both code & number and number format ok, OR completely empty.
  const isValid =
    (isDialSelected && isNumberValid) || (!isDialSelected && !isNumberEntered);

  useEffect(() => {
    if (isValid && formatted !== value) {
      onChange(formatted);
    }else if(!isValid && value !== ''){
      onChange('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatted, isValid]);

  /* ---------- handlers ---------- */
  const handleDialChange = useCallback((newDial: string) => {
    setPhone((prev) => ({ ...prev, dialCode: newDial }));
    setOpen(false);
    setSearchTerm('');
  }, []);

  const handleLocalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, '');
      setPhone((prev) => ({ ...prev, local: digits }));
    },
    []
  );

  /* ---------- validation & error messaging ---------- */
  let errorMessage = '';
  if (isDialSelected && !isNumberEntered) {
    errorMessage = 'Enter a phone number.';
  } else if (!isDialSelected && isNumberEntered) {
    errorMessage = 'Select a dial code.';
  } else if (isDialSelected && !isNumberValid) {
    errorMessage = 'Enter a valid number (4-15 digits).';
  }

  /* ---------- render ---------- */
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={inputId}>
        {label}
        {required && ' *'}
      </Label>

      {helperText && (
        <p className="mb-1 text-xs text-gray-500">{helperText}</p>
      )}

      <div className="flex gap-2">
        {/* dial-code selector with search */}
        <Select
          value={dialCode}
          onValueChange={handleDialChange}
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setSearchTerm('');
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Code">
              {dialCode && `${dialCode} ${countryCodes.find(cc => cc.dial_code === dialCode)?.code}`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto w-48">
            {/* search bar */}
            <div className="p-2 border-b bg-background sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 opacity-50" />
                <input
                  className="flex w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {countryCodes
              .filter((cc) => {
                if (searchTerm.trim() === '') return true;
                const term = searchTerm.toLowerCase();
                return (
                  cc.dial_code.toLowerCase().includes(term) ||
                  cc.name.toLowerCase().includes(term)
                );
              })
              .map((cc) => (
                <SelectItem key={cc.code} value={cc.dial_code}>
                  {`${cc.dial_code} ${cc.name}`}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* local number */}
        <Input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={15}
          required={required}
          value={local}
          onChange={handleLocalChange}
          className={cn(
            'flex-1',
            errorMessage && 'border-red-500 focus-visible:ring-red-500'
          )}
        />
      </div>

      {errorMessage && (
        <p className="text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  );
};