import { useState, useCallback } from 'react';

export interface SessionBottle {
  docId: string;
  producer: string;
  vintage: number;
}

interface ScanSession {
  isActive: boolean;
  bottleCount: number;
  committedBottles: SessionBottle[];
  startSession: () => void;
  commitInSession: (docId: string, producer: string, vintage: number) => void;
  endSession: () => SessionBottle[];
  discardDraft: () => void;
}

export function useScanSession(): ScanSession {
  const [active, setActive] = useState(false);
  const [bottles, setBottles] = useState<SessionBottle[]>([]);

  const startSession = useCallback(() => {
    setActive(true);
  }, []);

  const commitInSession = useCallback((docId: string, producer: string, vintage: number) => {
    if (!active) setActive(true);
    setBottles(prev => [...prev, { docId, producer, vintage }]);
  }, [active]);

  const endSession = useCallback(() => {
    const result = [...bottles];
    setActive(false);
    setBottles([]);
    return result;
  }, [bottles]);

  const discardDraft = useCallback(() => {
    // No-op on counter — just signals camera reopen
  }, []);

  return {
    isActive: active,
    bottleCount: bottles.length + 1, // current bottle being scanned
    committedBottles: bottles,
    startSession,
    commitInSession,
    endSession,
    discardDraft,
  };
}
