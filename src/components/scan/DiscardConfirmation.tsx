import React from 'react';
import { Heading, MonoLabel, Button } from '@/components/rc';

interface DiscardConfirmationProps {
  title?: string;
  message?: string;
  onDiscard: () => void;
  onKeep: () => void;
}

const DiscardConfirmation: React.FC<DiscardConfirmationProps> = ({
  title = 'DISCARD THIS SCAN?',
  message = 'Your current scan will be lost.',
  onDiscard,
  onKeep,
}) => {
  return (
    <div className="absolute inset-0 z-10 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-sm bg-[var(--rc-surface-primary)] rounded-t-[var(--rc-radius-lg)] sm:rounded-[var(--rc-radius-lg)] p-6 space-y-5 shadow-[var(--rc-shadow-elevated)]">
        <div className="text-center space-y-2">
          <Heading scale="heading">{title}</Heading>
          <MonoLabel size="micro" colour="ghost">{message}</MonoLabel>
        </div>
        <div className="space-y-2">
          <Button variantType="Destructive" label="DISCARD" onClick={onDiscard} className="w-full" />
          <Button variantType="Secondary" label="KEEP EDITING" onClick={onKeep} className="w-full" />
        </div>
      </div>
    </div>
  );
};

export default DiscardConfirmation;
