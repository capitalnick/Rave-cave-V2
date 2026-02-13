import React from 'react';
import { cn } from '@/lib/utils';
import { Card, Heading, Body } from '@/components/rc';
import type { Occasion } from '@/types';

interface OccasionCardProps {
  occasion: Occasion;
  onClick: () => void;
  disabled?: boolean;
}

const OccasionCard: React.FC<OccasionCardProps> = ({ occasion, onClick, disabled = false }) => {
  const accentVar = `var(--rc-${occasion.accentToken})`;
  const Icon = occasion.icon;
  const isFeatured = occasion.featured;

  return (
    <Card
      elevation="flat"
      padding="standard"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "transition-all duration-150 ease-out select-none",
        isFeatured ? "flex flex-row items-center gap-4" : "flex flex-col items-center gap-2",
        "md:hover:-translate-y-[2px] md:hover:shadow-[var(--rc-card-shadow-raised)]",
        "active:scale-[0.97]",
        disabled && "opacity-40 pointer-events-none"
      )}
      style={{ borderTop: `3px solid ${accentVar}` }}
    >
      <Icon
        size={isFeatured ? 32 : 28}
        style={{ color: accentVar }}
        aria-hidden="true"
        className="shrink-0"
      />
      <div className={cn(isFeatured ? "text-left" : "text-center")}>
        <Heading scale="subhead" colour="primary">
          {occasion.title.toUpperCase()}
        </Heading>
        <Body size="caption" colour="ghost">
          {occasion.description}
        </Body>
      </div>
    </Card>
  );
};

export default OccasionCard;
