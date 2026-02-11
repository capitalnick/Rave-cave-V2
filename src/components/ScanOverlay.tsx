import React from 'react';
import { Crosshair } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Heading, MonoLabel } from '@/components/rc';

interface ScanOverlayProps {
  open: boolean;
  onClose: () => void;
}

const ScanOverlay: React.FC<ScanOverlayProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center">
          <div className="w-16 h-16 rounded-full bg-[var(--rc-surface-secondary)] flex items-center justify-center mb-4">
            <Crosshair size={32} className="text-[var(--rc-accent-pink)]" />
          </div>
          <DialogTitle asChild>
            <Heading scale="heading" align="centre">SCAN LABEL</Heading>
          </DialogTitle>
          <DialogDescription asChild>
            <MonoLabel size="caption" colour="ghost" align="centre">
              Coming in Phase 8
            </MonoLabel>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default ScanOverlay;
