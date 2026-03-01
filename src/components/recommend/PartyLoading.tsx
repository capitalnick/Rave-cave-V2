import React, { useState, useEffect } from 'react';
import { Heading, MonoLabel, Body } from '@/components/rc';
import {
  PARTY_LOADING_MESSAGES,
  getPartyTimeEstimate,
  PARTY_LONG_WAIT_MESSAGE,
} from '@/constants';
import type { PartyContext } from '@/types';

interface PartyLoadingProps {
  context: PartyContext;
}

const PartyLoading: React.FC<PartyLoadingProps> = ({ context }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [showLongWait, setShowLongWait] = useState(false);

  // Cycle at 5-second intervals
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev =>
        prev < PARTY_LOADING_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Long-wait message after 20 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowLongWait(true), 20000);
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
        <Heading scale="heading">WINES FOR A CROWD</Heading>
        <MonoLabel size="micro" colour="ghost" className="w-auto">
          Allocating {context.totalBottles} bottles for {context.guests} guests
        </MonoLabel>
      </div>

      {/* Time estimate */}
      <div className="py-3 px-4 rounded-lg border border-[var(--rc-border-subtle)] bg-[var(--rc-surface-secondary)]">
        <Body size="caption" colour="secondary">
          {getPartyTimeEstimate(context.guests)}
        </Body>
      </div>

      {/* Progress bar — indeterminate sweep */}
      <div className="w-full h-[2px] bg-[var(--rc-surface-secondary)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--rc-accent-pink)] rounded-full"
          style={{ animation: 'progress-sweep 2.5s ease-in-out infinite' }}
        />
      </div>

      {/* Crowd skeleton — rows representing wine type allocations */}
      <div className="flex-1 space-y-3">
        {['RED', 'WHITE', 'ROSÉ', 'SPARKLING'].map((type, i) => (
          <div
            key={type}
            className="flex items-center gap-3 py-2"
          >
            <MonoLabel size="micro" colour="ghost" className="w-16 flex-shrink-0">
              {type}
            </MonoLabel>
            <div
              className="flex-1 h-3 rounded bg-[var(--rc-surface-secondary)] animate-pulse"
              style={{ animationDelay: `${i * 120}ms` }}
            />
            <div
              className="h-3 w-10 rounded bg-[var(--rc-surface-secondary)] animate-pulse flex-shrink-0"
              style={{ animationDelay: `${i * 120 + 60}ms` }}
            />
          </div>
        ))}
      </div>

      {/* Status message */}
      <div className="space-y-1 pb-2">
        <MonoLabel
          size="label"
          colour="accent-pink"
          align="centre"
          className="animate-pulse transition-all duration-500"
        >
          {PARTY_LOADING_MESSAGES[messageIndex]}
        </MonoLabel>

        <div
          className={`transition-opacity duration-1000 ${showLongWait ? 'opacity-100' : 'opacity-0'}`}
        >
          <MonoLabel size="micro" colour="ghost" align="centre">
            {PARTY_LONG_WAIT_MESSAGE}
          </MonoLabel>
        </div>
      </div>
    </div>
  );
};

export default PartyLoading;
