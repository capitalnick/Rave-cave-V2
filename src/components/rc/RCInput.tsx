import React from 'react';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

export type InputType = 'Text' | 'Search' | 'Textarea';
export type InputState = 'Default' | 'Focus' | 'Error' | 'Disabled';
export type InputSize = 'Mobile' | 'Desktop';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'size'> {
  typeVariant?: InputType;
  state?: InputState;
  sizeVariant?: InputSize;
  helperText?: string;
  valueOverride?: string;
  externalField?: boolean;
}

export const Input: React.FC<InputProps> = ({
  typeVariant = 'Text',
  state = 'Default',
  sizeVariant = 'Mobile',
  helperText,
  valueOverride,
  externalField = false,
  className,
  value,
  onChange,
  ...props
}) => {
  const isDesktop = sizeVariant === 'Desktop';
  const isTextarea = typeVariant === 'Textarea';
  const isSearch = typeVariant === 'Search';
  const isError = state === 'Error';
  const isDisabled = state === 'Disabled';
  const isFocus = state === 'Focus';

  const [internalValue, setInternalValue] = React.useState(valueOverride || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInternalValue(e.target.value);
    onChange?.(e as any);
  };

  const handleClear = () => {
    setInternalValue('');
    // Create a mock event for onChange if needed, or just call it with empty string if expected
  };

  const baseStyles = cn(
    "w-full flex items-center transition-all duration-200 font-['Instrument_Sans'] bg-[var(--rc-input-bg)] border",
    isDesktop ? "rounded-[var(--rc-input-radius)]" : "rounded-[var(--rc-input-radius)]",
    !isError ? "border-[var(--rc-input-border)]" : "border-[var(--rc-input-border-error)]",
    isDisabled && "bg-[var(--rc-input-disabled-bg)] cursor-not-allowed",
    // Phase 1.4 focus treatment
    (isFocus || "focus-within:border-[var(--rc-accent-pink)]") && (
      isDesktop ? "focus-within:shadow-[var(--shadow-rc-focus-pink)]" : ""
    )
  );

  const inputPadding = isDesktop 
    ? (isSearch ? "pl-10 pr-4" : "px-[var(--rc-input-padding-h-desktop)]") 
    : (isSearch ? "pl-12 pr-4" : "px-[var(--rc-input-padding-h-mobile)]");

  const inputStyles = cn(
    "w-full bg-transparent outline-none text-[var(--rc-input-text)] placeholder:text-[var(--rc-input-placeholder)]",
    isDesktop ? "text-[14px] h-[var(--rc-input-height-desktop)]" : "text-[16px] h-[var(--rc-input-height-mobile)]",
    isTextarea && "h-auto py-3 resize-none",
    isTextarea && (isDesktop ? "min-h-[var(--rc-textarea-min-height-desktop)]" : "min-h-[var(--rc-textarea-min-height-mobile)]"),
    inputPadding
  );

  const Component = isTextarea ? 'textarea' : 'input';

  return (
    <div className="flex flex-col w-full gap-1.5">
      <div className={cn("relative group", baseStyles, className)}>
        {isSearch && (
          <Search 
            className={cn(
              "absolute text-[var(--rc-input-placeholder)]",
              isDesktop ? "left-3.5 w-4 h-4" : "left-4 w-5 h-5"
            )} 
          />
        )}
        
        <Component
          {...(props as any)}
          disabled={isDisabled}
          value={value !== undefined ? value : internalValue}
          onChange={handleChange}
          className={inputStyles}
        />

        {/* Phase 3.3 Clear button for Search */}
        {isSearch && internalValue && !isDisabled && (
          <button 
            onClick={handleClear}
            className={cn(
              "absolute right-3 p-1 rounded-full hover:bg-gray-100 transition-colors text-[var(--rc-ink-ghost)]",
              isDesktop ? "w-6 h-6" : "w-7 h-7"
            )}
          >
            <X className="w-full h-full" />
          </button>
        )}
      </div>

      {/* Phase 1.4 suppress if externalField is true */}
      {helperText && !externalField && (
        <span className={cn(
          "text-[12px] px-1",
          isError ? "text-[var(--rc-accent-coral)]" : "text-[var(--rc-ink-ghost)]"
        )}>
          {helperText}
        </span>
      )}
    </div>
  );
};
