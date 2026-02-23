import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import WineIcon from '@/components/icons/WineIcon';
import { Card, Heading, Body, MonoLabel, Button, showToast } from '@/components/rc';

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
      'Free accounts can store up to 24 bottles. Upgrade to Premium for unlimited cellar space.',
  },
};

function handleUpgrade() {
  showToast({ tone: 'neutral', message: 'Premium coming soon! Contact support for early access.' });
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ variant, feature, onDismiss }) => {
  const copy = FEATURE_COPY[feature];

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
          <Button variantType="Primary" label="Upgrade to Premium" onClick={handleUpgrade} className="w-full max-w-[280px]" />
          <div className="h-3" />
          <MonoLabel size="label" colour="ghost" className="w-auto">Free during early access</MonoLabel>
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
        onClick={(e) => { if (e.target === e.currentTarget) onDismiss?.(); }}
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
            <div className="h-6" />
            <div className="flex gap-3">
              <Button variantType="Secondary" label="Maybe Later" onClick={() => onDismiss?.()} className="flex-1" />
              <Button variantType="Primary" label="Upgrade" onClick={handleUpgrade} className="flex-1" />
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpgradePrompt;
