import React from 'react';
import type { Wine } from '@/types';
import { Button } from '@/components/rc';

interface WineBriefActionsProps {
  fields: Partial<Wine>;
  onAddToCellar: (wine: Partial<Wine>) => void;
  onDismiss: () => void;
}

const WineBriefActions: React.FC<WineBriefActionsProps> = ({ fields, onAddToCellar, onDismiss }) => {
  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-[var(--rc-surface-elevated,#2d2d2d)] border-t border-[var(--rc-border-emphasis)]">
      <Button variantType="Primary" label="+ ADD TO CELLAR" onClick={() => onAddToCellar(fields)} className="flex-1" />
      <Button variantType="Secondary" label="GOT WHAT I NEEDED" onClick={onDismiss} className="flex-1" />
    </div>
  );
};

export default WineBriefActions;
