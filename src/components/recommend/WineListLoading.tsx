import React, { useState, useEffect } from 'react';
import { Heading, MonoLabel, Body } from '@/components/rc';
import {
  WINELIST_EXTRACTION_MESSAGES,
  getWineListTimeEstimate,
  WINELIST_LONG_WAIT_MESSAGE,
} from '@/constants';

interface WineListLoadingProps {
  pageCount: number;
}

function WineRowSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center gap-3 py-3 border-b border-[var(--rc-border-subtle)]"
    >
      <div className="flex-1 space-y-1.5">
        <div
          className="h-3.5 w-48 rounded bg-[var(--rc-surface-secondary)] animate-pulse"
          style={{ animationDelay: `${delay}ms` }}
        />
        <div
          className="h-3 w-28 rounded bg-[var(--rc-surface-secondary)] animate-pulse"
          style={{ animationDelay: `${delay + 75}ms` }}
        />
      </div>
      <div
        className="h-3 w-14 rounded bg-[var(--rc-surface-secondary)] animate-pulse flex-shrink-0"
        style={{ animationDelay: `${delay + 150}ms` }}
      />
    </div>
  );
}

const WineListLoading: React.FC<WineListLoadingProps> = ({ pageCount }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [showLongWait, setShowLongWait] = useState(false);

  // Cycle messages at 8-second intervals
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev =>
        prev < WINELIST_EXTRACTION_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Show long-wait reassurance after 60 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowLongWait(true), 60000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-full px-6 pt-8 pb-6 space-y-6 max-w-md mx-auto w-full">
      <style>{`
        @keyframes progress-sweep {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 40%; margin-left: 30%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="space-y-1">
        <Heading scale="heading">ANALYSING WINE LIST</Heading>
        <MonoLabel size="micro" colour="ghost" className="w-auto">
          Step 1 of 2 — Reading the list
        </MonoLabel>
      </div>

      {/* Time estimate */}
      <div className="py-3 px-4 rounded-lg border border-[var(--rc-border-subtle)] bg-[var(--rc-surface-secondary)]">
        <Body size="caption" colour="secondary">
          {getWineListTimeEstimate(pageCount)}
        </Body>
      </div>

      {/* Progress bar — indeterminate sweep */}
      <div className="w-full h-[2px] bg-[var(--rc-surface-secondary)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--rc-accent-acid)] rounded-full"
          style={{ animation: 'progress-sweep 2.5s ease-in-out infinite' }}
        />
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--rc-accent-acid)] animate-pulse" />
          <MonoLabel size="micro" colour="primary" className="w-auto">READING LIST</MonoLabel>
        </div>
        <div className="flex-1 h-px bg-[var(--rc-border-subtle)]" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--rc-surface-secondary)]" />
          <MonoLabel size="micro" colour="ghost" className="w-auto">R&Eacute;MY'S PICKS</MonoLabel>
        </div>
      </div>

      {/* Wine entry skeletons */}
      <div className="flex-1 overflow-hidden">
        <div className="space-y-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <WineRowSkeleton key={i} delay={i * 100} />
          ))}
        </div>
      </div>

      {/* Status message */}
      <div className="space-y-1 pb-2">
        <MonoLabel
          size="label"
          colour="accent-pink"
          className="animate-pulse transition-all duration-500 text-center w-full block"
        >
          {WINELIST_EXTRACTION_MESSAGES[messageIndex]}
        </MonoLabel>

        {/* Long-wait reassurance — fades in after 60 seconds */}
        <div
          className={`transition-opacity duration-1000 ${showLongWait ? 'opacity-100' : 'opacity-0'}`}
        >
          <MonoLabel size="micro" colour="ghost" className="text-center w-full block">
            {WINELIST_LONG_WAIT_MESSAGE}
          </MonoLabel>
        </div>
      </div>
    </div>
  );
};

export default WineListLoading;
