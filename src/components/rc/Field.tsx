import React from 'react';
import { cn } from '@/lib/utils';

export interface FieldProps {
  labelText: string;
  helperText?: string;
  errorText?: string;
  showHelper?: boolean;
  showError?: boolean;
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  labelText,
  helperText = "Supporting copy",
  errorText = "Validation error",
  showHelper = true,
  showError = false,
  children,
  id: providedId,
  className,
}) => {
  const generatedId = React.useId();
  const id = providedId || generatedId;

  const isErrorVisible = showError;
  const isHelperVisible = showHelper && !showError;

  // Clone children to inject id and externalField prop
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, { 
        id, 
        externalField: true,
        state: isErrorVisible ? 'Error' : child.props.state 
      });
    }
    return child;
  });

  return (
    <div className={cn("flex flex-col w-full gap-[var(--rc-space-md,8px)] h-fit", className)}>
      <label 
        htmlFor={id}
        className="font-['Instrument_Sans'] text-[14px] font-semibold text-[var(--rc-ink-primary)] select-none"
      >
        {labelText}
      </label>

      <div className="w-full">
        {childrenWithProps}
      </div>

      {isHelperVisible && (
        <span className="font-['Instrument_Sans'] text-[13px] text-[var(--rc-ink-ghost)]">
          {helperText}
        </span>
      )}

      {isErrorVisible && (
        <span className="font-['Instrument_Sans'] text-[13px] text-[var(--rc-accent-coral)] font-medium">
          {errorText}
        </span>
      )}
    </div>
  );
};
