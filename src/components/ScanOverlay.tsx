import React from 'react';
import ScanRegisterOverlay from './scan/ScanRegisterOverlay';
import type { Wine, WineDraft } from '@/types';

interface ScanOverlayProps {
  open: boolean;
  onClose: () => void;
  inventory: Wine[];
  onWineCommitted?: (docId: string | string[]) => void;
  onViewWine?: (wine: Wine) => void;
  prefillData?: Partial<Wine> | null;
  onAskRemy?: (draft: WineDraft) => void;
  manualEntryDirect?: boolean;
  onClearManualEntryDirect?: () => void;
  onImport?: () => void;
}

/**
 * Thin wrapper preserving the App.tsx import. Delegates to ScanRegisterOverlay.
 */
const ScanOverlay: React.FC<ScanOverlayProps> = ({ open, onClose, inventory, onWineCommitted, onViewWine, prefillData, onAskRemy, manualEntryDirect, onClearManualEntryDirect, onImport }) => {
  return (
    <ScanRegisterOverlay
      open={open}
      onClose={onClose}
      inventory={inventory}
      onWineCommitted={onWineCommitted}
      onViewWine={onViewWine}
      prefillData={prefillData}
      onAskRemy={onAskRemy}
      manualEntryDirect={manualEntryDirect}
      onClearManualEntryDirect={onClearManualEntryDirect}
      onImport={onImport}
    />
  );
};

export default ScanOverlay;
