import React, { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AnimatePresence, motion } from 'framer-motion';
import ModeSelector from './ModeSelector';
import ExtractionProgress from './ExtractionProgress';
import RegisterDraft from './RegisterDraft';
import DuplicateAlert from './DuplicateAlert';
import type { Wine, ScanStage, WineDraft, ExtractionResult, DraftImage, DuplicateCandidate, CommitStage } from '@/types';
import { compressImageForExtraction, compressImageForStorage, createPreviewUrl } from '@/utils/imageCompression';
import { extractWineFromLabel } from '@/services/extractionService';
import { findDuplicates } from '@/services/duplicateService';
import { inventoryService } from '@/services/inventoryService';
import { uploadLabelImage, deleteLabelImage } from '@/services/storageService';
import { showToast, Heading, MonoLabel, Button } from '@/components/rc';

// ── State Machine ──

interface ScanState {
  stage: ScanStage;
  draft: WineDraft | null;
  error: string | null;
  previewUrl: string | null;
  rawFile: File | null;
}

type ScanAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'CAPTURE'; file: File; previewUrl: string }
  | { type: 'EXTRACTION_SUCCESS'; fields: Partial<Wine>; extraction: ExtractionResult }
  | { type: 'EXTRACTION_FAIL'; error: string }
  | { type: 'MANUAL_ENTRY' }
  | { type: 'RETAKE' }
  | { type: 'UPDATE_DRAFT'; fields: Partial<Wine> }
  | { type: 'START_COMMIT' }
  | { type: 'COMMIT_SUCCESS' }
  | { type: 'COMMIT_FAIL'; error: string }
  | { type: 'SHOW_SUCCESS_SCREEN' };

const initialState: ScanState = {
  stage: 'closed',
  draft: null,
  error: null,
  previewUrl: null,
  rawFile: null,
};

function makeDraft(
  source: 'scan' | 'manual',
  fields: Partial<Wine>,
  extraction: ExtractionResult | null,
  image: DraftImage | null
): WineDraft {
  return {
    draftId: crypto.randomUUID(),
    source,
    fields,
    extraction,
    image,
    createdAt: new Date().toISOString(),
  };
}

function reducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case 'OPEN':
      return { ...initialState, stage: 'mode-select' };
    case 'CLOSE':
      return initialState;
    case 'CAPTURE':
      return {
        ...state,
        stage: 'extracting',
        error: null,
        previewUrl: action.previewUrl,
        rawFile: action.file,
      };
    case 'EXTRACTION_SUCCESS':
      return {
        ...state,
        stage: 'draft',
        error: null,
        draft: makeDraft(
          'scan',
          action.fields,
          action.extraction,
          state.previewUrl ? { localUri: state.previewUrl, remoteUrl: null } : null
        ),
      };
    case 'EXTRACTION_FAIL':
      return { ...state, stage: 'extracting', error: action.error };
    case 'MANUAL_ENTRY':
      return {
        ...state,
        stage: 'draft',
        error: null,
        draft: makeDraft('manual', { quantity: 1, price: 0, format: '750ml' }, null, null),
      };
    case 'RETAKE':
      return { ...state, stage: 'mode-select', error: null, draft: null, previewUrl: null, rawFile: null };
    case 'UPDATE_DRAFT':
      if (!state.draft) return state;
      return { ...state, draft: { ...state.draft, fields: { ...state.draft.fields, ...action.fields } } };
    case 'START_COMMIT':
      return { ...state, stage: 'committing' };
    case 'COMMIT_SUCCESS':
      return { ...state, stage: 'committed' };
    case 'COMMIT_FAIL':
      return { ...state, stage: 'draft', error: action.error };
    case 'SHOW_SUCCESS_SCREEN':
      return { ...state, stage: 'success-screen' };
    default:
      return state;
  }
}

// ── Component ──

interface ScanRegisterOverlayProps {
  open: boolean;
  onClose: () => void;
  inventory: Wine[];
  onWineCommitted?: (docId: string) => void;
  onViewWine?: (wine: Wine) => void;
}

const stageMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.2 },
};

const ScanRegisterOverlay: React.FC<ScanRegisterOverlayProps> = ({ open, onClose, inventory, onWineCommitted, onViewWine }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [duplicateCandidate, setDuplicateCandidate] = useState<DuplicateCandidate | null>(null);
  const [commitStage, setCommitStage] = useState<CommitStage>('idle');
  const lastCommittedDocId = useRef<string | null>(null);
  const lastCommittedName = useRef<string>('');
  const prevOpenRef = useRef(open);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Open/close sync
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      dispatch({ type: 'OPEN' });
      setDuplicateCandidate(null);
    } else if (!open && prevOpenRef.current) {
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      dispatch({ type: 'CLOSE' });
      setDuplicateCandidate(null);
    }
    prevOpenRef.current = open;
  }, [open]);

  // Browser back button handling (WineModal pattern)
  useEffect(() => {
    if (!open) return;
    const handlePopState = () => onCloseRef.current();
    window.history.pushState({ scanOverlay: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open]);

  // Handle image capture
  const handleCapture = useCallback(async (file: File) => {
    const previewUrl = createPreviewUrl(file);
    dispatch({ type: 'CAPTURE', file, previewUrl });

    try {
      const base64 = await compressImageForExtraction(file);
      const { fields, extraction } = await extractWineFromLabel(base64);
      dispatch({ type: 'EXTRACTION_SUCCESS', fields, extraction });
    } catch (e: any) {
      dispatch({ type: 'EXTRACTION_FAIL', error: e.message || 'Failed to read label' });
    }
  }, []);

  const handleManualEntry = useCallback(() => {
    dispatch({ type: 'MANUAL_ENTRY' });
  }, []);

  const handleRetake = useCallback(() => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    dispatch({ type: 'RETAKE' });
    setDuplicateCandidate(null);
  }, [state.previewUrl]);

  const handleUpdateFields = useCallback((fields: Partial<Wine>) => {
    dispatch({ type: 'UPDATE_DRAFT', fields });
  }, []);

  // ── Commit Flow ──
  const handleConfirm = useCallback(async () => {
    if (!state.draft) return;
    const draftFields = state.draft.fields;

    // 1. Check for duplicates
    const dupes = findDuplicates(draftFields, inventory);
    if (dupes.length > 0 && !duplicateCandidate) {
      setDuplicateCandidate(dupes[0]);
      return;
    }

    // 2. Proceed with commit — show saving animation
    dispatch({ type: 'START_COMMIT' });
    setCommitStage('saving');

    try {
      const wineData = {
        producer: draftFields.producer || '',
        name: draftFields.name || '',
        vintage: draftFields.vintage || 0,
        type: draftFields.type || 'Red',
        cepage: draftFields.cepage || '',
        region: draftFields.region || '',
        country: draftFields.country || '',
        quantity: draftFields.quantity || 1,
        drinkFrom: draftFields.drinkFrom || 0,
        drinkUntil: draftFields.drinkUntil || 0,
        maturity: draftFields.maturity || 'Unknown',
        tastingNotes: draftFields.tastingNotes || '',
        price: draftFields.price || 0,
        format: draftFields.format || '750ml',
        appellation: draftFields.appellation || '',
        personalNote: draftFields.personalNote || '',
      } as Omit<Wine, 'id'>;

      const docId = await inventoryService.addWine(wineData);
      if (!docId) throw new Error('Failed to save to cellar');

      // 3. Upload image in background (non-blocking)
      if (state.rawFile) {
        const rawFile = state.rawFile;
        compressImageForStorage(rawFile)
          .then((blob) => uploadLabelImage(blob, docId))
          .then((url) => inventoryService.updateField(docId, 'imageUrl', url))
          .catch((err) => console.error('Image upload failed (non-blocking):', err));
      }

      lastCommittedDocId.current = docId;
      lastCommittedName.current = `${draftFields.vintage || ''} ${draftFields.producer || 'Wine'}`.trim();

      dispatch({ type: 'COMMIT_SUCCESS' });
      setCommitStage('success');

      // 4. Show toast with undo (10s window)
      showToast({
        tone: 'success',
        message: `${lastCommittedName.current} added to cellar`,
        actionLabel: 'UNDO',
        duration: 10000,
        onAction: async () => {
          await inventoryService.deleteWine(docId);
          deleteLabelImage(docId).catch(() => {});
          showToast({ tone: 'neutral', message: 'Removed.' });
        },
      });
    } catch (e: any) {
      dispatch({ type: 'COMMIT_FAIL', error: e.message || 'Failed to save' });
      setCommitStage('error');
    }
  }, [state.draft, state.rawFile, state.previewUrl, inventory, duplicateCandidate, onClose]);

  // Called when CommitTransition's success animation completes
  const handleCommitAnimationComplete = useCallback(() => {
    setCommitStage('idle');
    dispatch({ type: 'SHOW_SUCCESS_SCREEN' });
  }, []);

  // "SCAN ANOTHER" on success screen
  const handleScanAnother = useCallback(() => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    dispatch({ type: 'RETAKE' });
    setCommitStage('idle');
  }, [state.previewUrl]);

  // "DONE" on success screen
  const handleDone = useCallback(() => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    const docId = lastCommittedDocId.current;
    onClose();
    if (docId) onWineCommitted?.(docId);
  }, [state.previewUrl, onClose, onWineCommitted]);

  // "View existing bottle" from duplicate alert
  const handleViewExisting = useCallback(() => {
    if (!duplicateCandidate) return;
    setDuplicateCandidate(null);
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    onClose();
    onViewWine?.(duplicateCandidate.existingWine);
  }, [duplicateCandidate, state.previewUrl, onClose, onViewWine]);

  // Handle "Add to existing" from duplicate alert
  const handleAddToExisting = useCallback(async () => {
    if (!duplicateCandidate) return;
    const existing = duplicateCandidate.existingWine;
    const newQty = (existing.quantity || 1) + 1;
    await inventoryService.updateField(existing.id, 'quantity', newQty);

    setDuplicateCandidate(null);
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    onClose();

    showToast({
      tone: 'success',
      message: `${existing.producer} quantity updated to ${newQty}`,
    });
  }, [duplicateCandidate, state.previewUrl, onClose]);

  // Handle "Keep as separate" from duplicate alert
  const handleKeepSeparate = useCallback(() => {
    setDuplicateCandidate(null);
    // Re-trigger confirm, now with duplicateCandidate cleared the check will pass
    handleConfirm();
  }, [handleConfirm]);

  const handleClose = useCallback(() => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    setDuplicateCandidate(null);
    onClose();
  }, [onClose, state.previewUrl]);

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="max-w-full sm:max-w-3xl w-full h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto bg-[var(--rc-surface-primary)] border-[var(--rc-divider-emphasis-weight)] border-[var(--rc-ink-primary)] shadow-[var(--rc-shadow-elevated)] p-0 gap-0 rounded-none sm:rounded-[var(--rc-radius-lg)] relative"
      >
        <DialogTitle className="sr-only">Scan &amp; Register Wine</DialogTitle>

        <AnimatePresence mode="wait">
          {state.stage === 'mode-select' && (
            <motion.div key="mode-select" {...stageMotion}>
              <ModeSelector
                onCapture={handleCapture}
                onManualEntry={handleManualEntry}
              />
            </motion.div>
          )}

          {state.stage === 'extracting' && (
            <motion.div key="extracting" {...stageMotion}>
              <ExtractionProgress
                previewUrl={state.previewUrl}
                error={state.error}
                onRetake={handleRetake}
                onManualEntry={handleManualEntry}
              />
            </motion.div>
          )}

          {(state.stage === 'draft' || state.stage === 'committing' || state.stage === 'committed') && state.draft && (
            <motion.div key="draft" {...stageMotion}>
              <RegisterDraft
                draft={state.draft}
                onUpdateFields={handleUpdateFields}
                onConfirm={handleConfirm}
                onRetake={handleRetake}
                isCommitting={state.stage === 'committing'}
                commitStage={commitStage}
                onCommitAnimationComplete={handleCommitAnimationComplete}
              />
            </motion.div>
          )}

          {state.stage === 'success-screen' && (
            <motion.div key="success-screen" {...stageMotion}>
              <div className="flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[50vh] px-6 py-10 space-y-6">
                <div className="w-16 h-16 rounded-full bg-[var(--rc-accent-acid)] flex items-center justify-center">
                  <span className="text-[var(--rc-ink-primary)] text-3xl font-bold">✓</span>
                </div>
                <div className="text-center space-y-2">
                  <Heading scale="heading">ADDED TO CELLAR</Heading>
                  <MonoLabel size="caption" colour="ghost">
                    {lastCommittedName.current}
                  </MonoLabel>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <Button variant="Primary" onClick={handleScanAnother} className="w-full">
                    SCAN ANOTHER
                  </Button>
                  <Button variant="Secondary" onClick={handleDone} className="w-full">
                    DONE
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duplicate Alert overlay */}
        {duplicateCandidate && (
          <DuplicateAlert
            candidate={duplicateCandidate}
            onAddToExisting={handleAddToExisting}
            onKeepSeparate={handleKeepSeparate}
            onViewExisting={handleViewExisting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScanRegisterOverlay;
