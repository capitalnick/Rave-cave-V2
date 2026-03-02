import React from 'react';
import { Heading, Body } from '@/components/rc';
import { Button } from '@/components/rc';

interface PulseEmptyStateProps {
  onScanPress: () => void;
}

const PulseEmptyState: React.FC<PulseEmptyStateProps> = ({ onScanPress }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-20 text-center">
      <Heading scale="heading" align="centre" className="max-w-md mb-4">
        ADD MORE BOTTLES TO SEE PATTERNS.
      </Heading>
      <Body size="body" colour="secondary" align="centre" className="max-w-sm mb-8">
        Pulse needs at least 3 bottles to generate insights about your cellar.
      </Body>
      <Button variantType="Primary" label="ADD WINE" onClick={onScanPress} />
    </div>
  );
};

export default PulseEmptyState;
