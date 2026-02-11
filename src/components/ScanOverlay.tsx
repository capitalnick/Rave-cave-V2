import React from 'react';
import ScanRegisterOverlay from './scan/ScanRegisterOverlay';
import type { Wine } from '@/types';

interface ScanOverlayProps {
  open: boolean;
  onClose: () => void;
  inventory: Wine[];
  onWineCommitted?: (docId: string | string[]) => void;
  onViewWine?: (wine: Wine) => void;
}

/**
 * Thin wrapper preserving the App.tsx import. Delegates to ScanRegisterOverlay.
 */
const ScanOverlay: React.FC<ScanOverlayProps> = ({ open, onClose, inventory, onWineCommitted, onViewWine }) => {
  return (
    <ScanRegisterOverlay
      open={open}
      onClose={onClose}
      inventory={inventory}
      onWineCommitted={onWineCommitted}
      onViewWine={onViewWine}
    />
  );
};

export default ScanOverlay;
