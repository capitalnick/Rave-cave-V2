import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

export type WineType = 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'orange';
export type IndicatorFormat = 'strip' | 'dot' | 'pill';

interface WineTypeIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  wineType: WineType;
  format: IndicatorFormat;
}

export const WineTypeIndicator = React.forwardRef<HTMLDivElement, WineTypeIndicatorProps>(
  ({ wineType, format, className, ...props }, ref) => {
    const isSparkling = wineType === 'sparkling';
    const isDessert = wineType === 'dessert';
    
    const colorMap = {
      red: 'var(--rc-wine-red)',
      white: 'var(--rc-wine-white)',
      rose: 'var(--rc-wine-rose)',
      sparkling: 'var(--rc-wine-sparkling)',
      dessert: 'var(--rc-wine-dessert)',
      orange: 'var(--rc-wine-orange)',
    };

    const labelMap = {
      red: 'Red',
      white: 'White',
      rose: 'Rosé',
      sparkling: 'Sparkling',
      dessert: 'Dessert',
      orange: 'Orange',
    };

    const color = colorMap[wineType];
    const label = labelMap[wineType];

    // Format: Strip
    if (format === 'strip') {
      return (
        <div
          ref={ref}
          className={cn(
            "absolute left-0 top-0 bottom-0 w-[3px] md:w-[4px] z-10 transition-all",
            className
          )}
          style={{ backgroundColor: color }}
          {...props}
        >
          {isSparkling && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white/50">
              <Sparkles className="w-2 h-2" />
            </div>
          )}
          {isDessert && (
            <div 
              className="absolute inset-0" 
              style={{ backgroundColor: 'rgba(217, 169, 56, 0.15)' }}
            />
          )}
        </div>
      );
    }

    // Format: Dot
    if (format === 'dot') {
      return (
        <div
          ref={ref}
          className={cn("inline-flex items-center justify-center w-2 h-2 relative", className)}
          aria-label={`Wine Type: ${label}`}
          {...props}
        >
          {isSparkling ? (
            <Sparkles className="w-2 h-2" style={{ color }} />
          ) : (
            <div 
              className="w-full h-full rounded-full relative overflow-hidden"
              style={{ backgroundColor: color }}
            >
              {isDessert && (
                <div 
                  className="absolute inset-0" 
                  style={{ backgroundColor: 'rgba(217, 169, 56, 0.15)' }}
                />
              )}
            </div>
          )}
        </div>
      );
    }

    // Format: Pill
    const isPink = wineType === 'red';
    const textColor = isPink ? 'var(--rc-ink-on-accent)' : 'var(--rc-ink-primary)';

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center h-6 px-3 rounded-full overflow-hidden",
          "font-['Space_Mono',monospace] text-[11px] md:text-[12px] uppercase tracking-wider font-bold",
          className
        )}
        style={{ backgroundColor: color, color: textColor }}
        {...props}
      >
        {isDessert && (
          <div 
            className="absolute inset-0 pointer-events-none" 
            style={{ backgroundColor: 'rgba(217, 169, 56, 0.15)' }}
          />
        )}
        <div className="relative flex items-center gap-1">
          {isSparkling && <Sparkles className="w-3 h-3" />}
          <span>{label}</span>
        </div>
      </div>
    );
  }
);

WineTypeIndicator.displayName = 'WineTypeIndicator';
