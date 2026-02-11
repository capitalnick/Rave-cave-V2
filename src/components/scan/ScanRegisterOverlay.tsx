import React, { useReducer, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AnimatePresence, motion } from 'framer-motion';
import ModeSelector from './ModeSelector';
import ExtractionProgress from './ExtractionProgress';
import type { Wine, ScanStage, WineDraft, ExtractionResult, DraftImage } from '@/types';
import { compressImageForExtraction, createPreviewUrl } from '@/utils/imageCompression';
import { extractWineFromLabel } from '@/services/extractionService';

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
  | { type: 'COMMIT_FAIL'; error: string };

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
      // Revoke old preview URL
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
    default:
      return state;
  }
}

// ── Component ──

interface ScanRegisterOverlayProps {
  open: boolean;
  onClose: () => void;
  inventory: Wine[];
}

const stageMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.2 },
};

const ScanRegisterOverlay: React.FC<ScanRegisterOverlayProps> = ({ open, onClose, inventory }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const prevOpenRef = useRef(open);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Open/close sync
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      dispatch({ type: 'OPEN' });
    } else if (!open && prevOpenRef.current) {
      // Revoke preview URL on close
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      dispatch({ type: 'CLOSE' });
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
  }, [state.previewUrl]);

  const handleClose = useCallback(() => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    onClose();
  }, [onClose, state.previewUrl]);

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="max-w-full sm:max-w-3xl w-full h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto bg-[var(--rc-surface-primary)] border-[var(--rc-divider-emphasis-weight)] border-[var(--rc-ink-primary)] shadow-[var(--rc-shadow-elevated)] p-0 gap-0 rounded-none sm:rounded-[var(--rc-radius-lg)]"
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

          {(state.stage === 'draft' || state.stage === 'committing') && state.draft && (
            <motion.div key="draft" {...stageMotion}>
              {/* RegisterDraft will be wired in PR 8.3 */}
              <div className="p-8 text-center space-y-4">
                <p className="font-[var(--rc-font-mono)] text-xs uppercase tracking-widest text-[var(--rc-ink-ghost)]">
                  Draft stage — form coming in PR 8.3
                </p>
                <pre className="text-left text-xs bg-[var(--rc-surface-secondary)] p-4 rounded overflow-auto max-h-60">
                  {JSON.stringify(state.draft.fields, null, 2)}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default ScanRegisterOverlay;
