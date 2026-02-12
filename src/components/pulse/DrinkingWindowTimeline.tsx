import React, { useMemo } from 'react';
import type { DrinkingWindow } from '@/types';
import { Card, Heading, Chip, MonoLabel, InlineMessage } from '@/components/rc';
import DrinkingWindowBar from './DrinkingWindowBar';

interface DrinkingWindowTimelineProps {
  windows: DrinkingWindow[];
  range: { min: number; max: number };
  onWineTap: (wineId: string) => void;
  onSeeAll: () => void;
}

const currentYear = new Date().getFullYear();

function useResponsiveCount(): number {
  const [count, setCount] = React.useState(4);
  React.useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setCount(w >= 1024 ? 8 : w >= 640 ? 6 : 4);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return count;
}

const DrinkingWindowTimeline: React.FC<DrinkingWindowTimelineProps> = ({
  windows,
  range,
  onWineTap,
  onSeeAll,
}) => {
  const visibleCount = useResponsiveCount();
  const visibleWindows = useMemo(
    () => windows.slice(0, visibleCount),
    [windows, visibleCount]
  );

  const totalSpan = range.max - range.min;
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = range.min; y <= range.max; y++) arr.push(y);
    return arr;
  }, [range]);

  const currentYearPct = totalSpan > 0
    ? ((currentYear - range.min) / totalSpan) * 100
    : 50;

  if (windows.length === 0) {
    return (
      <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-subtle)]">
        <Heading scale="subhead" className="mb-4 pb-2 border-b-4 border-[var(--rc-accent-coral)]">
          DRINKING WINDOWS
        </Heading>
        <InlineMessage tone="info" message="Add drinking windows to your wines to see the timeline" />
      </Card>
    );
  }

  return (
    <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-subtle)]">
      <div className="flex items-center justify-between mb-4 pb-2 border-b-4 border-[var(--rc-accent-coral)]">
        <Heading scale="subhead">DRINKING WINDOWS</Heading>
        {windows.length > visibleCount && (
          <button
            onClick={onSeeAll}
            className="font-[var(--rc-font-mono)] text-[11px] uppercase tracking-wider text-[var(--rc-ink-primary)] underline underline-offset-2 hover:text-[var(--rc-accent-pink)] transition-colors"
          >
            See all →
          </button>
        )}
      </div>

      {/* Timeline area */}
      <div className="relative">
        {/* Year axis */}
        <div className="flex justify-between mb-2 pl-[100px] sm:pl-[160px]">
          {years.map(y => (
            <span
              key={y}
              className="font-[var(--rc-font-mono)] text-[9px] text-[var(--rc-ink-ghost)] flex-1 text-center"
            >
              {y}
            </span>
          ))}
        </div>

        {/* Wine rows */}
        <div className="space-y-1">
          {visibleWindows.map((w) => (
            <div key={w.wineId} className="flex items-center gap-2">
              {/* Label */}
              <div className="w-[100px] sm:w-[160px] flex-shrink-0 overflow-hidden">
                <span
                  className="block font-[var(--rc-font-body)] text-[12px] sm:text-[13px] text-[var(--rc-ink-primary)] truncate cursor-pointer hover:text-[var(--rc-accent-pink)]"
                  onClick={() => onWineTap(w.wineId)}
                >
                  {w.vintage} {w.producer}
                </span>
              </div>
              {/* Bar area */}
              <div className="flex-1 relative">
                <DrinkingWindowBar
                  window={w}
                  range={range}
                  onTap={() => onWineTap(w.wineId)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Current year marker */}
        {totalSpan > 0 && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: `calc(100px + (100% - 100px) * ${currentYearPct / 100})` }}
          >
            <div className="h-full border-l-2 border-dashed border-[var(--rc-accent-pink)] opacity-60" />
            <div className="absolute -top-5 -translate-x-1/2 bg-[var(--rc-accent-pink)] text-white font-[var(--rc-font-mono)] text-[8px] px-1.5 py-0.5 rounded-full">
              {currentYear}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-[var(--rc-border-subtle)]">
        <Chip variant="Maturity" state="Selected" maturityValue="drink-now" label="Drink Now" />
        <Chip variant="Maturity" state="Selected" maturityValue="hold" label="Hold" />
        <Chip variant="Maturity" state="Selected" maturityValue="past-peak" label="Past Peak" />
      </div>
    </Card>
  );
};

export default DrinkingWindowTimeline;
