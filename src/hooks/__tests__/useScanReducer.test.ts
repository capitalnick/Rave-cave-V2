import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScanReducer } from '../useScanReducer';

describe('useScanReducer', () => {
  it('starts in closed stage', () => {
    const { result } = renderHook(() => useScanReducer());
    const [state] = result.current;
    expect(state.stage).toBe('closed');
    expect(state.draft).toBeNull();
  });

  it('OPEN → mode-select', () => {
    const { result } = renderHook(() => useScanReducer());
    act(() => result.current[1]({ type: 'OPEN' }));
    expect(result.current[0].stage).toBe('mode-select');
  });

  it('CAPTURE → reviewing', () => {
    const { result } = renderHook(() => useScanReducer());
    act(() => result.current[1]({ type: 'OPEN' }));
    act(() => result.current[1]({ type: 'CAPTURE', file: new File([], 'test.jpg'), previewUrl: 'blob:test' }));
    expect(result.current[0].stage).toBe('reviewing');
    expect(result.current[0].previewUrl).toBe('blob:test');
  });

  it('GALLERY_CAPTURE → extracting', () => {
    const { result } = renderHook(() => useScanReducer());
    act(() => result.current[1]({ type: 'OPEN' }));
    act(() => result.current[1]({ type: 'GALLERY_CAPTURE', file: new File([], 'test.jpg'), previewUrl: 'blob:test' }));
    expect(result.current[0].stage).toBe('extracting');
  });

  it('REVIEW_ACCEPT → extracting', () => {
    const { result } = renderHook(() => useScanReducer());
    act(() => result.current[1]({ type: 'OPEN' }));
    act(() => result.current[1]({ type: 'CAPTURE', file: new File([], 'test.jpg'), previewUrl: 'blob:test' }));
    act(() => result.current[1]({ type: 'REVIEW_ACCEPT' }));
    expect(result.current[0].stage).toBe('extracting');
  });

  it('EXTRACTION_SUCCESS → draft with wine data', () => {
    const { result } = renderHook(() => useScanReducer());
    act(() => result.current[1]({ type: 'OPEN' }));
    act(() => result.current[1]({ type: 'GALLERY_CAPTURE', file: new File([], 'test.jpg'), previewUrl: 'blob:test' }));
    act(() => result.current[1]({
      type: 'EXTRACTION_SUCCESS',
      fields: { producer: 'Penfolds', vintage: 2019 },
      extraction: { fields: {}, status: 'complete', imageQuality: 'high' },
    }));
    expect(result.current[0].stage).toBe('draft');
    expect(result.current[0].draft?.fields.producer).toBe('Penfolds');
  });

  it('MANUAL_ENTRY → draft with defaults', () => {
    const { result } = renderHook(() => useScanReducer());
    act(() => result.current[1]({ type: 'OPEN' }));
    act(() => result.current[1]({ type: 'MANUAL_ENTRY' }));
    expect(result.current[0].stage).toBe('draft');
    expect(result.current[0].draft?.source).toBe('manual');
    expect(result.current[0].draft?.fields.quantity).toBe(1);
  });

  it('CLOSE → resets to initial state', () => {
    const { result } = renderHook(() => useScanReducer());
    act(() => result.current[1]({ type: 'OPEN' }));
    act(() => result.current[1]({ type: 'MANUAL_ENTRY' }));
    act(() => result.current[1]({ type: 'CLOSE' }));
    expect(result.current[0].stage).toBe('closed');
    expect(result.current[0].draft).toBeNull();
  });

  it('commit flow: START_COMMIT → COMMIT_SUCCESS → SHOW_SUCCESS_SCREEN', () => {
    const { result } = renderHook(() => useScanReducer());
    act(() => result.current[1]({ type: 'OPEN' }));
    act(() => result.current[1]({ type: 'MANUAL_ENTRY' }));
    act(() => result.current[1]({ type: 'START_COMMIT' }));
    expect(result.current[0].stage).toBe('committing');
    act(() => result.current[1]({ type: 'COMMIT_SUCCESS' }));
    expect(result.current[0].stage).toBe('committed');
    act(() => result.current[1]({ type: 'SHOW_SUCCESS_SCREEN' }));
    expect(result.current[0].stage).toBe('success-screen');
  });

  it('SCAN_NEXT → resets to mode-select for multi-scan', () => {
    const { result } = renderHook(() => useScanReducer());
    act(() => result.current[1]({ type: 'OPEN' }));
    act(() => result.current[1]({ type: 'MANUAL_ENTRY' }));
    act(() => result.current[1]({ type: 'START_COMMIT' }));
    act(() => result.current[1]({ type: 'COMMIT_SUCCESS' }));
    act(() => result.current[1]({ type: 'SHOW_SUCCESS_SCREEN' }));
    act(() => result.current[1]({ type: 'SCAN_NEXT' }));
    expect(result.current[0].stage).toBe('mode-select');
    expect(result.current[0].draft).toBeNull();
  });
});
