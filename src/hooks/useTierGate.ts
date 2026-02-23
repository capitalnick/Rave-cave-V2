import { useState, useCallback } from 'react';
import { useProfile } from '@/context/ProfileContext';

export function useTierGate() {
  const { isPremium } = useProfile();
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<'remy' | 'bottles'>('remy');

  const requirePremium = useCallback((feature: 'remy' | 'bottles', action: () => void) => {
    if (isPremium) {
      action();
    } else {
      setUpgradeFeature(feature);
      setUpgradePromptOpen(true);
    }
  }, [isPremium]);

  return {
    isPremium,
    upgradePromptOpen,
    upgradeFeature,
    closeUpgradePrompt: useCallback(() => setUpgradePromptOpen(false), []),
    requirePremium,
  };
}
