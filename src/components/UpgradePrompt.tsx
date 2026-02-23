import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import WineIcon from '@/components/icons/WineIcon';
import { Card, Heading, Body, MonoLabel, Button, InlineMessage } from '@/components/rc';
import { authFetch } from '@/utils/authFetch';
import { FUNCTION_URLS } from '@/config/functionUrls';

interface UpgradePromptProps {
  variant: 'fullscreen' | 'modal';
  feature: 'remy' | 'bottles';
  onDismiss?: () => void;
}

const FEATURE_COPY = {
  remy: {
    title: 'Meet Rémy, Your AI Sommelier',
    description:
      'Rémy knows your cellar inside out. Get personalised food pairings, tasting notes, and expert advice — all powered by AI. Upgrade to Premium to unlock Rémy.',
  },
  bottles: {
    title: 'Your Cellar is Full',
    description:
      'Free accounts can store up to 50 bottles. Upgrade to Premium for unlimited cellar space.',
  },
};

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ variant, feature, onDismiss }) => {
  const copy = FEATURE_COPY[feature];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(FUNCTION_URLS.createCheckout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to start checkout');
      }
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (variant === 'fullscreen') {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="max-w-[440px] text-center flex flex-col items-center">
          <WineIcon size={48} className="text-[var(--rc-accent-pink)]" />
          <div className="h-4" />
          <Heading scale="title" colour="accent-pink" align="centre">{copy.title}</Heading>
          <div className="h-3" />
          <Body className="w-auto text-center">{copy.description}</Body>
          <div className="h-8" />
          <Button
            variantType="Primary"
            label={loading ? 'Redirecting...' : 'Upgrade to Premium'}
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full max-w-[280px]"
          />
          {error && (
            <>
              <div className="h-3" />
              <InlineMessage tone="error" message={error} />
            </>
          )}
          <div className="h-3" />
          <MonoLabel size="label" colour="ghost" className="w-auto">$4.99/month — cancel anytime</MonoLabel>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4"
        onClick={(e) => { if (e.target === e.currentTarget && !loading) onDismiss?.(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-[400px]"
        >
          <Card elevation="raised" padding="standard">
            <Heading scale="heading" colour="accent-pink">{copy.title}</Heading>
            <div className="h-3" />
            <Body className="w-auto">{copy.description}</Body>
            {error && (
              <>
                <div className="h-3" />
                <InlineMessage tone="error" message={error} />
              </>
            )}
            <div className="h-6" />
            <div className="flex gap-3">
              <Button variantType="Secondary" label="Maybe Later" onClick={() => onDismiss?.()} disabled={loading} className="flex-1" />
              <Button variantType="Primary" label={loading ? 'Redirecting...' : 'Upgrade'} onClick={handleUpgrade} disabled={loading} className="flex-1" />
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpgradePrompt;
