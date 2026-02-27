import React, { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AnimatePresence, motion } from 'framer-motion';
import ModeSelector from './ModeSelector';
import CaptureReview from './CaptureReview';
import ExtractionProgress from './ExtractionProgress';
import RegisterDraft from './RegisterDraft';
import DuplicateAlert from './DuplicateAlert';
import SessionHeader from './SessionHeader';
import DiscardConfirmation from './DiscardConfirmation';
import type { Wine, ScanStage, WineDraft, ExtractionResult, DraftImage, DuplicateCandidate, CommitStage, ExtractionErrorCode, WineBriefContext } from '@/types';
import { compressImageForExtraction, compressImageForStorage, compressImageForThumbnail, createPreviewUrl } from '@/utils/imageCompression';
import { extractWineFromLabel, ExtractionError } from '@/services/extractionService';
import { analyseImageQuality } from '@/utils/imageQuality';
import { findDuplicates } from '@/services/duplicateService';
import { inventoryService } from '@/services/inventoryService';
import { uploadLabelImage, deleteLabelImage } from '@/services/storageService';
import { enrichWine } from '@/services/enrichmentService';
import { sanitizeWineName } from '@/utils/wineNameGuard';
import { showToast, Heading, MonoLabel, Button } from '@/components/rc';
import UpgradePrompt from '@/components/UpgradePrompt';
import { useProfile } from '@/context/ProfileContext';
import { CONFIG } from '@/constants';
import { useScanSession } from '@/hooks/useScanSession';
import { confirmProdWrite } from '@/components/ProdWriteGuard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { useIsMobile } from '@/components/ui/use-mobile';
import { hapticHeavy } from '@/utils/haptics';
import { trackEvent } from '@/config/analytics';

// ── State Machine ──

interface ScanState {
  stage: ScanStage;
  draft: WineDraft | null;
  error: string | null;
  errorCode: ExtractionErrorCode | null;
  previewUrl: string | null;
  rawFile: File | null;
  autoCapture: boolean;
}

type ScanAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'CAPTURE'; file: File; previewUrl: string }
  | { type: 'GALLERY_CAPTURE'; file: File; previewUrl: string }
  | { type: 'REVIEW_ACCEPT' }
  | { type: 'EXTRACTION_SUCCESS'; fields: Partial<Wine>; extraction: ExtractionResult }
  | { type: 'EXTRACTION_FAIL'; error: string; errorCode?: ExtractionErrorCode }
  | { type: 'MANUAL_ENTRY' }
  | { type: 'RETAKE' }
  | { type: 'SCAN_NEXT' }
  | { type: 'RETRY' }
  | { type: 'UPDATE_DRAFT'; fields: Partial<Wine> }
  | { type: 'START_COMMIT' }
  | { type: 'COMMIT_SUCCESS' }
  | { type: 'COMMIT_FAIL'; error: string }
  | { type: 'SHOW_SUCCESS_SCREEN' }
  | { type: 'PREFILL_OPEN'; fields: Partial<Wine> };

const initialState: ScanState = {
  stage: 'closed',
  draft: null,
  error: null,
  errorCode: null,
  previewUrl: null,
  rawFile: null,
  autoCapture: false,
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
        stage: 'reviewing',
        error: null,
        errorCode: null,
        previewUrl: action.previewUrl,
        rawFile: action.file,
        autoCapture: false,
      };
    case 'GALLERY_CAPTURE':
      return {
        ...state,
        stage: 'extracting',
        error: null,
        errorCode: null,
        previewUrl: action.previewUrl,
        rawFile: action.file,
        autoCapture: false,
      };
    case 'REVIEW_ACCEPT':
      return { ...state, stage: 'extracting', error: null, errorCode: null };
    case 'EXTRACTION_SUCCESS':
      return {
        ...state,
        stage: 'draft',
        error: null,
        errorCode: null,
        draft: makeDraft(
          'scan',
          action.fields,
          action.extraction,
          state.previewUrl ? { localUri: state.previewUrl, remoteUrl: null } : null
        ),
      };
    case 'EXTRACTION_FAIL':
      return { ...state, stage: 'extracting', error: action.error, errorCode: action.errorCode ?? null };
    case 'MANUAL_ENTRY':
      return {
        ...state,
        stage: 'draft',
        error: null,
        errorCode: null,
        draft: makeDraft('manual', { quantity: 1, price: 0, format: '750ml' }, null, null),
      };
    case 'RETAKE':
      return { ...state, stage: 'mode-select', error: null, errorCode: null, draft: null, previewUrl: null, rawFile: null, autoCapture: false };
    case 'SCAN_NEXT':
      return { ...state, stage: 'mode-select', error: null, errorCode: null, draft: null, previewUrl: null, rawFile: null, autoCapture: true };
    case 'RETRY':
      return { ...state, stage: 'extracting', error: null, errorCode: null };
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
    case 'PREFILL_OPEN':
      return {
        ...initialState,
        stage: 'draft',
        draft: makeDraft('manual', { quantity: 1, price: 0, format: '750ml', ...action.fields }, null, null),
      };
    default:
      return state;
  }
}

// ── Component ──

interface ScanRegisterOverlayProps {
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

const ScanRegisterOverlay: React.FC<ScanRegisterOverlayProps> = ({ open, onClose, inventory, onWineCommitted, onViewWine, prefillData, onAskRemy, manualEntryDirect, onClearManualEntryDirect, onImport }) => {
  const { isPremium } = useProfile();
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const isMobile = useIsMobile();
  const { keyboardVisible } = useKeyboardVisible();
  const reducedMotion = useReducedMotion();
  const stageMotion = reducedMotion
    ? { initial: {}, animate: {}, exit: {}, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -16 }, transition: { duration: 0.2 } };
  const [state, dispatch] = useReducer(reducer, initialState);
  const [duplicateCandidate, setDuplicateCandidate] = useState<DuplicateCandidate | null>(null);
  const [commitStage, setCommitStage] = useState<CommitStage>('idle');
  const [moreFieldsExpanded, setMoreFieldsExpanded] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const lastCommittedDocId = useRef<string | null>(null);
  const lastCommittedName = useRef<string>('');
  const prevOpenRef = useRef(open);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const session = useScanSession();

  // Open/close sync
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      if (manualEntryDirect) {
        dispatch({ type: 'MANUAL_ENTRY' });
        setMoreFieldsExpanded(true);
        onClearManualEntryDirect?.();
      } else if (prefillData) {
        dispatch({ type: 'PREFILL_OPEN', fields: prefillData });
        setMoreFieldsExpanded(true);
      } else {
        dispatch({ type: 'OPEN' });
        setMoreFieldsExpanded(false);
      }
      setDuplicateCandidate(null);
    } else if (!open && prevOpenRef.current) {
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      dispatch({ type: 'CLOSE' });
      setDuplicateCandidate(null);
    }
    prevOpenRef.current = open;
  }, [open, prefillData, manualEntryDirect, onClearManualEntryDirect]);

  // Browser back button handling (WineModal pattern)
  useEffect(() => {
    if (!open) return;
    const handlePopState = () => {
      if (session.isActive && (state.stage === 'draft' || state.stage === 'extracting' || state.stage === 'reviewing')) {
        setShowDiscard(true);
        window.history.pushState({ scanOverlay: true }, '');
      } else {
        onCloseRef.current();
      }
    };
    window.history.pushState({ scanOverlay: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open, session.isActive, state.stage]);

  // ── Extraction helper ──
  const runExtraction = useCallback(async (file: File) => {
    if (!navigator.onLine) {
      dispatch({ type: 'EXTRACTION_FAIL', error: 'No internet connection. Try entering details manually.', errorCode: 'PROXY_ERROR' });
      return;
    }

    try {
      const base64 = await compressImageForExtraction(file);
      const { fields, extraction } = await extractWineFromLabel(base64);
      dispatch({ type: 'EXTRACTION_SUCCESS', fields, extraction });
    } catch (e: any) {
      const errorCode = e instanceof ExtractionError ? e.code : 'UNKNOWN';
      dispatch({ type: 'EXTRACTION_FAIL', error: e.message || 'Failed to read label', errorCode: errorCode as ExtractionErrorCode });
    }
  }, []);

  // Camera capture → reviewing stage (quality gate)
  const handleCameraCapture = useCallback((file: File) => {
    trackEvent('scan_started');
    const previewUrl = createPreviewUrl(file);
    dispatch({ type: 'CAPTURE', file, previewUrl });
  }, []);

  // Gallery capture → straight to extraction (no quality gate UX)
  const handleGalleryCapture = useCallback((file: File) => {
    const previewUrl = createPreviewUrl(file);
    dispatch({ type: 'GALLERY_CAPTURE', file, previewUrl });
    runExtraction(file);

    // Silent quality analysis for dev telemetry
    analyseImageQuality(file).catch(() => {});
  }, [runExtraction]);

  // Review accepted → proceed to extraction
  const handleReviewAccept = useCallback(() => {
    if (!state.rawFile) return;
    dispatch({ type: 'REVIEW_ACCEPT' });
    runExtraction(state.rawFile);
  }, [state.rawFile, runExtraction]);

  // Retry extraction with same file
  const handleRetry = useCallback(async () => {
    if (!state.rawFile) return;
    dispatch({ type: 'RETRY' });
    runExtraction(state.rawFile);
  }, [state.rawFile, runExtraction]);

  const handleManualEntry = useCallback(() => {
    dispatch({ type: 'MANUAL_ENTRY' });
    setMoreFieldsExpanded(true);
  }, []);

  const handleRetake = useCallback(() => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    dispatch({ type: 'RETAKE' });
    setDuplicateCandidate(null);
  }, [state.previewUrl]);

  const handleUpdateFields = useCallback((fields: Partial<Wine>) => {
    dispatch({ type: 'UPDATE_DRAFT', fields });
  }, []);

  const handleToggleMoreFields = useCallback(() => {
    setMoreFieldsExpanded(prev => !prev);
  }, []);

  const handleAskRemy = useCallback(() => {
    if (state.draft && onAskRemy) onAskRemy(state.draft);
  }, [state.draft, onAskRemy]);

  // Image quality warning
  const imageQualityWarning = state.draft?.extraction?.imageQuality === 'low'
    ? 'Image quality is low — some fields may need correction.'
    : null;

  // ── Commit Flow ──
  const handleConfirm = useCallback(async () => {
    if (!state.draft) return;
    const draftFields = state.draft.fields;

    // 0a. Bottle cap check
    const addingQuantity = draftFields.quantity || 1;
    const currentTotal = inventory.reduce((sum, w) => sum + (Number(w.quantity) || 0), 0);
    if (!isPremium && currentTotal + addingQuantity > CONFIG.FREE_TIER.MAX_BOTTLES) {
      setUpgradePromptOpen(true);
      return;
    }

    // 0. Production write guard
    const confirmed = await confirmProdWrite();
    if (!confirmed) return;

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
      const cleanedFields = sanitizeWineName(draftFields);
      const wineData = {
        producer: cleanedFields.producer || '',
        name: cleanedFields.name || '',
        vintage: cleanedFields.vintage || 0,
        type: cleanedFields.type || 'Red',
        grapeVarieties: cleanedFields.grapeVarieties ?? [],
        region: cleanedFields.region || '',
        country: cleanedFields.country || '',
        quantity: cleanedFields.quantity || 1,
        drinkFrom: cleanedFields.drinkFrom || 0,
        drinkUntil: cleanedFields.drinkUntil || 0,
        maturity: cleanedFields.maturity || 'Unknown',
        tastingNotes: cleanedFields.tastingNotes || '',
        price: cleanedFields.price || 0,
        format: cleanedFields.format || '750ml',
        appellation: cleanedFields.appellation || '',
        personalNote: cleanedFields.personalNote || '',
      } as Omit<Wine, 'id'>;

      const docId = await inventoryService.addWine(wineData);
      if (!docId) throw new Error('Failed to save to cellar');

      // 3. Upload image + thumbnail in background (non-blocking)
      if (state.rawFile) {
        const rawFile = state.rawFile;
        Promise.all([
          compressImageForStorage(rawFile),
          compressImageForThumbnail(rawFile),
        ])
          .then(([fullBlob, thumbBlob]) => uploadLabelImage(fullBlob, thumbBlob, docId))
          .then(({ imageUrl, thumbnailUrl }) =>
            inventoryService.updateFields(docId, { imageUrl, thumbnailUrl })
          )
          .catch((err) => console.error('Image upload failed (non-blocking):', err));
      }

      // Fire-and-forget enrichment (tasting notes, drink window, cepage, rating)
      enrichWine(docId, wineData as Partial<Wine>).catch(err =>
        console.error('Post-commit enrichment failed (non-blocking):', err));

      lastCommittedDocId.current = docId;
      lastCommittedName.current = `${draftFields.vintage || ''} ${draftFields.producer || 'Wine'}`.trim();

      // Track in session if active
      if (session.isActive) {
        session.commitInSession(docId, draftFields.producer || '', draftFields.vintage || 0);
      }

      dispatch({ type: 'COMMIT_SUCCESS' });
      trackEvent('wine_committed');
      setCommitStage('success');

      // 4. Show toast with undo (10s window)
      showToast({
        tone: 'success',
        message: `${lastCommittedName.current} added to cellar`,
        actionLabel: 'UNDO',
        duration: 10000,
        onAction: async () => {
          hapticHeavy();
          await inventoryService.deleteWine(docId);
          deleteLabelImage(docId).catch(() => {});
          showToast({ tone: 'neutral', message: 'Removed.' });
        },
      });
    } catch (e: any) {
      dispatch({ type: 'COMMIT_FAIL', error: e.message || 'Failed to save' });
      setCommitStage('error');
    }
  }, [state.draft, state.rawFile, state.previewUrl, inventory, duplicateCandidate, onClose, session]);

  // Called when CommitTransition's success animation completes
  const handleCommitAnimationComplete = useCallback(() => {
    setCommitStage('idle');
    dispatch({ type: 'SHOW_SUCCESS_SCREEN' });
  }, []);

  // "SCAN ANOTHER" on success screen — starts/continues multi-scan session
  const handleScanAnother = useCallback(() => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    if (!session.isActive) session.startSession();
    dispatch({ type: 'SCAN_NEXT' });
    setCommitStage('idle');
  }, [state.previewUrl, session]);

  // "DONE" on success screen
  const handleDone = useCallback(() => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    if (session.isActive) {
      const bottles = session.endSession();
      const allDocIds = bottles.map(b => b.docId);
      if (lastCommittedDocId.current && !allDocIds.includes(lastCommittedDocId.current)) {
        allDocIds.push(lastCommittedDocId.current);
      }
      onClose();
      if (allDocIds.length > 0) onWineCommitted?.(allDocIds);
    } else {
      const docId = lastCommittedDocId.current;
      onClose();
      if (docId) onWineCommitted?.(docId);
    }
  }, [state.previewUrl, onClose, onWineCommitted, session]);

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

    // Bottle cap check on merge
    const delta = newQty - (Number(existing.quantity) || 0);
    const currentTotal = inventory.reduce((sum, w) => sum + (Number(w.quantity) || 0), 0);
    if (!isPremium && currentTotal + delta > CONFIG.FREE_TIER.MAX_BOTTLES) {
      setUpgradePromptOpen(true);
      return;
    }

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
    handleConfirm();
  }, [handleConfirm]);

  const handleClose = useCallback(() => {
    if (session.isActive && state.stage === 'draft') {
      setShowDiscard(true);
      return;
    }
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    setDuplicateCandidate(null);
    onClose();
  }, [onClose, state.previewUrl, session.isActive, state.stage]);

  // Discard confirmation handlers
  const handleDiscardConfirm = useCallback(() => {
    setShowDiscard(false);
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    // Discard current draft, reopen camera
    dispatch({ type: 'SCAN_NEXT' });
  }, [state.previewUrl]);

  const handleDiscardKeep = useCallback(() => {
    setShowDiscard(false);
  }, []);

  if (!open) return null;

  const isOffline = !navigator.onLine;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        showClose={false}
        className={`!max-w-full sm:!max-w-3xl w-full overflow-hidden bg-[var(--rc-surface-primary)] border-[var(--rc-divider-emphasis-weight)] border-[var(--rc-ink-primary)] shadow-[var(--rc-shadow-elevated)] p-0 gap-0 ${
          isMobile
            ? '!inset-0 !translate-x-0 !translate-y-0 !rounded-none !w-full !h-full'
            : 'h-[90dvh] max-h-[90dvh] rounded-[var(--rc-radius-lg)]'
        }`}
      >
        <DialogTitle className="sr-only">Scan &amp; Register Wine</DialogTitle>

        {/* Session Header */}
        {session.isActive && (
          <SessionHeader
            bottleNumber={session.bottleCount}
            onDone={handleDone}
          />
        )}

        <AnimatePresence mode="wait">
          {state.stage === 'mode-select' && (
            <motion.div key="mode-select" {...stageMotion}>
              <ModeSelector
                onCameraCapture={handleCameraCapture}
                onGalleryCapture={handleGalleryCapture}
                onManualEntry={handleManualEntry}
                onImport={onImport}
                autoCapture={state.autoCapture}
              />
            </motion.div>
          )}

          {state.stage === 'reviewing' && state.rawFile && state.previewUrl && (
            <motion.div key="reviewing" {...stageMotion}>
              <CaptureReview
                file={state.rawFile}
                previewUrl={state.previewUrl}
                onAccept={handleReviewAccept}
                onRetake={handleRetake}
              />
            </motion.div>
          )}

          {state.stage === 'extracting' && (
            <motion.div key="extracting" {...stageMotion}>
              <ExtractionProgress
                previewUrl={state.previewUrl}
                error={state.error}
                errorCode={state.errorCode}
                isOffline={isOffline}
                onRetake={handleRetake}
                onManualEntry={handleManualEntry}
                onRetry={handleRetry}
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
                onAskRemy={onAskRemy ? handleAskRemy : undefined}
                imageQualityWarning={imageQualityWarning}
                moreFieldsExpanded={moreFieldsExpanded}
                onToggleMoreFields={handleToggleMoreFields}
                isMobile={isMobile}
                keyboardVisible={keyboardVisible}
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
                  <MonoLabel size="micro" colour="ghost">
                    {lastCommittedName.current}
                  </MonoLabel>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <Button variantType="Primary" label="SCAN ANOTHER" onClick={handleScanAnother} className="w-full" />
                  <Button variantType="Secondary" label="DONE" onClick={handleDone} className="w-full" />
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

        {/* Discard Confirmation overlay */}
        {showDiscard && (
          <DiscardConfirmation
            title={state.stage === 'draft' ? 'DISCARD THIS SCAN?' : 'Finish session?'}
            message={state.stage === 'draft' ? 'Your current scan will be lost.' : `${session.bottleCount} bottles have been added.`}
            onDiscard={handleDiscardConfirm}
            onKeep={handleDiscardKeep}
          />
        )}

        {/* Upgrade Prompt (bottle cap) */}
        {upgradePromptOpen && (
          <UpgradePrompt variant="modal" feature="bottles" onDismiss={() => setUpgradePromptOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScanRegisterOverlay;
