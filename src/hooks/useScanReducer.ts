import { useReducer } from 'react';
import type { Wine, ScanStage, WineDraft, ExtractionResult, DraftImage, ExtractionErrorCode } from '@/types';

// ── State ──

export interface ScanState {
  stage: ScanStage;
  draft: WineDraft | null;
  error: string | null;
  errorCode: ExtractionErrorCode | null;
  previewUrl: string | null;
  rawFile: File | null;
}

// ── Actions ──

export type ScanAction =
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

// ── Helpers ──

const initialState: ScanState = {
  stage: 'closed',
  draft: null,
  error: null,
  errorCode: null,
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

// ── Reducer ──

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
      };
    case 'GALLERY_CAPTURE':
      return {
        ...state,
        stage: 'extracting',
        error: null,
        errorCode: null,
        previewUrl: action.previewUrl,
        rawFile: action.file,
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
      return { ...state, stage: 'mode-select', error: null, errorCode: null, draft: null, previewUrl: null, rawFile: null };
    case 'SCAN_NEXT':
      return { ...state, stage: 'mode-select', error: null, errorCode: null, draft: null, previewUrl: null, rawFile: null };
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

// ── Hook ──

export function useScanReducer() {
  return useReducer(reducer, initialState);
}
