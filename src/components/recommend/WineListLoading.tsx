import React, { useState, useEffect } from 'react';
import { MonoLabel, SkeletonCard } from '@/components/rc';
import { WINELIST_STATUS_MESSAGES } from '@/constants';

interface WineListLoadingProps {
  pageCount: number;
}

const WineListLoading: React.FC<WineListLoadingProps> = ({ pageCount }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev =>
        prev < WINELIST_STATUS_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
      <div className="w-full max-w-md space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <MonoLabel size="label" colour="accent-pink" align="centre" className="animate-pulse">
        {WINELIST_STATUS_MESSAGES[messageIndex]}
      </MonoLabel>

      <MonoLabel size="micro" colour="ghost" align="centre" className="w-auto">
        Analysing {pageCount} page{pageCount !== 1 ? 's' : ''}
      </MonoLabel>
    </div>
  );
};

export default WineListLoading;
