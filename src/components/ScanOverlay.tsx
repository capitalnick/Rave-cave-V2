import React from 'react';
import ScanRegisterOverlay from './scan/ScanRegisterOverlay';
import type { Wine } from '@/types';

interface ScanOverlayProps {
  open: boolean;
  onClose: () => void;
  inventory: Wine[];
}

/**
 * Thin wrapper preserving the App.tsx import. Delegates to ScanRegisterOverlay.
 */
const ScanOverlay: React.FC<ScanOverlayProps> = ({ open, onClose, inventory }) => {
  return (
    <ScanRegisterOverlay open={open} onClose={onClose} inventory={inventory} />
  );
};

export default ScanOverlay;
