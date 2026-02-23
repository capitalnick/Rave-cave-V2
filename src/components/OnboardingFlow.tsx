import React, { useState } from 'react';
import { Camera, Database, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import WineIcon from '@/components/icons/WineIcon';
import { Heading, Body, Button, Card } from '@/components/rc';

interface OnboardingFlowProps {
  displayName: string | null;
  onComplete: () => void;
  onScanFirst: () => void;
}

const FEATURES = [
  {
    icon: Camera,
    title: 'Scan a Label',
    description: 'Point your camera at any wine bottle and we\u2019ll capture everything.',
  },
  {
    icon: Database,
    title: 'Build Your Cellar',
    description: 'Track every bottle \u2014 its value, its peak drinking window, and when to open it.',
  },
  {
    icon: Sparkles,
    title: 'Get Recommendations',
    description: 'Tell us the occasion and we\u2019ll pick the perfect bottle from your cellar.',
  },
];

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ displayName, onComplete, onScanFirst }) => {
  const [step, setStep] = useState(0);
  const firstName = displayName?.split(' ')[0] || null;

  const handleScanFirst = () => {
    onComplete();
    onScanFirst();
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-40 bg-[var(--rc-surface-primary)]">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
            className="min-h-full flex items-center justify-center px-6 py-12 sm:py-20"
          >
            <div className="max-w-[440px] text-center flex flex-col items-center">
              <WineIcon size={56} className="text-[var(--rc-accent-pink)]" />
              <div className="h-5" />
              <Heading scale="title" align="centre">
                Welcome to Rave Cave{firstName ? `, ${firstName}` : ''}!
              </Heading>
              <div className="h-3" />
              <Body className="w-auto text-center">Your personal AI sommelier and cellar manager.</Body>
              <div className="h-8" />
              <Button variantType="Primary" label="Get Started" onClick={() => setStep(1)} className="w-full max-w-[280px]" />
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
            className="min-h-full flex items-center justify-center px-6 py-12 sm:py-20"
          >
            <div className="max-w-[500px] w-full flex flex-col items-center">
              <div className="w-full space-y-4">
                {FEATURES.map((f) => (
                  <Card key={f.title} elevation="flat" padding="standard">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--rc-surface-tertiary)] flex items-center justify-center">
                        <f.icon size={20} className="text-[var(--rc-accent-pink)]" />
                      </div>
                      <div>
                        <Heading scale="subhead">{f.title}</Heading>
                        <div className="h-1" />
                        <Body className="w-auto">{f.description}</Body>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="h-8" />
              <Button variantType="Primary" label="Next" onClick={() => setStep(2)} className="w-full max-w-[280px]" />
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
            className="min-h-full flex items-center justify-center px-6 py-12 sm:py-20"
          >
            <div className="max-w-[440px] text-center flex flex-col items-center">
              <WineIcon size={48} className="text-[var(--rc-accent-pink)]" />
              <div className="h-4" />
              <Heading scale="heading" align="centre">Ready to start?</Heading>
              <div className="h-3" />
              <Body className="w-auto text-center">Scan your first wine label to begin building your cellar.</Body>
              <div className="h-8" />
              <Button variantType="Primary" label="Scan Your First Label" onClick={handleScanFirst} className="w-full max-w-[280px]" />
              <div className="h-4" />
              <Button variantType="Tertiary" label="I'll explore first" onClick={handleSkip} className="w-full max-w-[280px]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingFlow;
