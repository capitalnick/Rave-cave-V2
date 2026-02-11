import React from 'react';
import { Heading, MonoLabel, Body, Button } from '@/components/rc';
import { WineTypeIndicator } from '@/components/rc';
import { toRCWineCardProps } from '@/lib/adapters';
import type { DuplicateCandidate } from '@/types';

interface DuplicateAlertProps {
  candidate: DuplicateCandidate;
  onAddToExisting: () => void;
  onKeepSeparate: () => void;
}

const DuplicateAlert: React.FC<DuplicateAlertProps> = ({
  candidate,
  onAddToExisting,
  onKeepSeparate,
}) => {
  const { existingWine, matchedFields, similarityScore } = candidate;
  const rcProps = toRCWineCardProps(existingWine);

  return (
    <div className="absolute inset-0 z-10 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-md bg-[var(--rc-surface-primary)] rounded-t-[var(--rc-radius-lg)] sm:rounded-[var(--rc-radius-lg)] p-6 space-y-5 shadow-[var(--rc-shadow-elevated)]">
        {/* Header */}
        <div className="text-center space-y-1">
          <Heading scale="heading">POSSIBLE DUPLICATE</Heading>
          <MonoLabel size="caption" colour="ghost">
            {Math.round(similarityScore * 100)}% match — {matchedFields.join(', ')}
          </MonoLabel>
        </div>

        {/* Existing wine mini-card */}
        <div className="flex items-center gap-3 p-3 border border-[var(--rc-border-emphasis)] rounded-[var(--rc-radius-md)] bg-[var(--rc-surface-secondary)]">
          <WineTypeIndicator type={rcProps.type} size="sm" />
          <div className="flex-1 min-w-0">
            <Body size="body" weight="bold" className="truncate">
              {existingWine.producer}
            </Body>
            <MonoLabel size="micro" colour="ghost">
              {existingWine.vintage} · {existingWine.name} · Qty: {existingWine.quantity}
            </MonoLabel>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="Primary" onClick={onAddToExisting} className="w-full">
            ADD TO EXISTING (+1 QTY)
          </Button>
          <Button variant="Secondary" onClick={onKeepSeparate} className="w-full">
            KEEP AS SEPARATE BOTTLE
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateAlert;
