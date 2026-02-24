import React from 'react';
import { Button, Heading, MonoLabel } from '@/components/rc';

interface CrowdShortfallErrorProps {
  needed: number;
  available: number;
  onSearchOutside: () => void;
  onAdjust: () => void;
}

const CrowdShortfallError: React.FC<CrowdShortfallErrorProps> = ({
  needed,
  available,
  onSearchOutside,
  onAdjust,
}) => {
  const shortfall = needed - available;

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 gap-8 text-center">
      {/* Editorial header */}
      <div className="space-y-2">
        <MonoLabel size="label" colour="ghost" align="centre">CELLAR CHECK</MonoLabel>
        <Heading scale="heading" align="centre">THE CELLAR'S A LITTLE LIGHT</Heading>
      </div>

      {/* Side-by-side bottle comparison */}
      <div className="flex items-stretch gap-4 w-full max-w-xs">
        {/* Needed */}
        <div className="flex-1 rounded-lg border border-[var(--rc-border-subtle)] bg-white p-4 text-center">
          <span className="font-[var(--rc-font-display)] font-black text-4xl text-[var(--rc-ink-primary)] tabular-nums block">
            {needed}
          </span>
          <MonoLabel size="micro" colour="ghost">NEEDED</MonoLabel>
        </div>
        {/* Available */}
        <div className="flex-1 rounded-lg border border-[var(--rc-border-subtle)] bg-white p-4 text-center">
          <span className="font-[var(--rc-font-display)] font-black text-4xl text-[var(--rc-accent-pink)] tabular-nums block">
            {available}
          </span>
          <MonoLabel size="micro" colour="ghost">IN CELLAR</MonoLabel>
        </div>
      </div>

      {/* Shortfall message */}
      <p className="font-[var(--rc-font-body)] text-sm text-[var(--rc-ink-secondary)] max-w-sm">
        You're <strong>{shortfall} bottle{shortfall !== 1 ? 's' : ''} short</strong> for this crowd.
        You can look beyond the cellar for the rest, or head back and adjust the numbers.
      </p>

      {/* CTAs */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          variantType="Primary"
          label="LOOK BEYOND THE CELLAR"
          onClick={onSearchOutside}
          className="w-full"
        />
        <button
          onClick={onAdjust}
          className="text-[var(--rc-accent-pink)] underline underline-offset-4 font-[var(--rc-font-mono)] text-xs uppercase tracking-wider"
        >
          Adjust the numbers
        </button>
      </div>
    </div>
  );
};

export default CrowdShortfallError;
