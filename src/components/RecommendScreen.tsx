import React from 'react';
import { Sparkles } from 'lucide-react';
import { Heading, MonoLabel } from '@/components/rc';

const RecommendScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--rc-surface-secondary)] flex items-center justify-center mb-6">
        <Sparkles size={32} className="text-[var(--rc-accent-pink)]" />
      </div>
      <Heading scale="title" align="centre" className="mb-3">RECOMMEND</Heading>
      <MonoLabel size="caption" colour="ghost" align="centre">
        AI-powered pairing suggestions — coming soon
      </MonoLabel>
    </div>
  );
};

export default RecommendScreen;
