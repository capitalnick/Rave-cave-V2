import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { WineTypeIndicator, WineType } from './WineTypeIndicator';
import { MonoLabel, Heading } from './typography';
import { Chip } from './Chip';
import { ImageWithFallback } from './figma/ImageWithFallback';

export interface WineCardProps {
  wine: {
    id: string;
    producer: string;
    varietal: string;
    vintage: string;
    type: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'orange';
    maturity: 'drink-now' | 'hold' | 'past-peak';
    image: string;
  };
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const RCWineCard = React.forwardRef<HTMLDivElement, WineCardProps>(
  ({ wine, onClick, disabled = false, className }, ref) => {
    const indicatorType = wine.type as WineType;

    // Map wine type to Heading colour tokens
    const wineTypeToHeadingColour = {
      red: 'accent-pink',
      white: 'accent-acid',
      rose: 'accent-coral',
      sparkling: 'accent-acid',
      dessert: 'accent-coral',
      orange: 'accent-coral',
    } as const;

    const vintageColour = wineTypeToHeadingColour[wine.type];

    return (
      <Card
        ref={ref}
        elevation="raised"
        padding="standard"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full max-w-full md:max-w-[280px] group flex flex-col",
          // We remove aspect-[3/4] to prevent content cutoff with large tokens
          // while maintaining a robust vertical layout.
          className
        )}
      >
        {/* Wine Type Accent Strip */}
        <WineTypeIndicator 
          wineType={indicatorType} 
          format="strip" 
          className="group-hover:w-[var(--rc-card-strip-width-hover)] transition-all duration-200"
        />

        {/* Image Zone - Square (1:1) per spec */}
        <div className="relative w-full aspect-square rounded-[var(--rc-card-image-radius)] overflow-hidden shrink-0">
          <ImageWithFallback
            src={wine.image}
            alt={`${wine.producer} ${wine.varietal}`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Data Zone */}
        <div className="flex flex-col flex-1 mt-[var(--rc-card-gap-image-to-data)] min-w-0">
          {/* Producer (Line 1) - Space Mono, 11/12px, Sentence Case */}
          <MonoLabel 
            size="label" 
            colour="tertiary" 
            uppercase={false} 
            truncate 
            className="mb-[var(--rc-card-gap-text-lines)]"
          >
            {wine.producer}
          </MonoLabel>

          {/* Varietal (Line 2) - Satoshi Black 700, 22/32px, Uppercase */}
          <Heading 
            scale="heading" 
            truncate 
            maxLines={1} 
            className="mb-[var(--rc-card-gap-text-lines)]"
          >
            {wine.varietal}
          </Heading>

          {/* Vintage (Line 3) - Satoshi Black 900, 44/72px, Wine-coloured */}
          <Heading 
            scale="vintage" 
            colour={vintageColour}
            className="mb-[var(--rc-card-gap-text-lines)]"
          >
            {wine.vintage}
          </Heading>

          {/* Maturity Chip (Line 4) - 24px Pill */}
          <div className="mt-auto pt-1 flex justify-start">
            <Chip 
              variant="Maturity" 
              state="Selected" 
              maturityValue={wine.maturity}
              label={wine.maturity.replace('-', ' ')}
            />
          </div>
        </div>
      </Card>
    );
  }
);

RCWineCard.displayName = 'RCWineCard';
