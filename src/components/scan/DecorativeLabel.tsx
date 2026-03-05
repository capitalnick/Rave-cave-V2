import React from 'react';
import { Heading, Body, Button } from '@/components/rc';

interface DecorativeLabelProps {
  previewUrl: string;
  onScanBack: () => void;
  onManualEntry: () => void;
}

const DecorativeLabel: React.FC<DecorativeLabelProps> = ({ previewUrl, onScanBack, onManualEntry }) => {
  return (
    <div className="flex flex-col items-center min-h-[60vh] sm:min-h-[50vh] px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      {/* Preview (de-emphasised — label is clear but has no text) */}
      <div className="flex-1 flex items-center justify-center w-full">
        <img
          src={previewUrl}
          alt="Decorative label"
          className="max-h-[60vh] max-w-full object-contain rounded-xl opacity-60"
        />
      </div>

      {/* Copy + CTAs */}
      <div className="w-full max-w-sm mt-6 space-y-4">
        <div className="space-y-2">
          <Heading scale="heading" align="centre">
            PURE ART. ZERO INFORMATION.
          </Heading>
          <Body size="body" colour="secondary" align="centre">
            {`R\u00e9my reads what he sees \u2014 and this side has no text on it. All the detail is on the back. Turn it around and scan again.`}
          </Body>
        </div>

        <div className="flex flex-col gap-3 w-full pt-2">
          <Button variantType="Primary" label="SCAN BACK LABEL" onClick={onScanBack} className="w-full" />
          <Button variantType="Secondary" label="ENTER MANUALLY" onClick={onManualEntry} className="w-full" />
        </div>
      </div>
    </div>
  );
};

export default DecorativeLabel;
