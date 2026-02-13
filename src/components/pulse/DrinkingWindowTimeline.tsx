import React, { useMemo } from 'react';
import type { DrinkingWindow } from '@/types';
import { Card, Heading, Chip, Body, MonoLabel, InlineMessage } from '@/components/rc';
import DrinkingWindowBar from './DrinkingWindowBar';

interface DrinkingWindowTimelineProps {
  windows: DrinkingWindow[];
  range: { min: number; max: number };
  onWineTap: (wineId: string) => void;
  onSeeAll: () => void;
  onChipClick?: (value: string) => void;
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
  onChipClick,
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
            className="underline underline-offset-2 hover:text-[var(--rc-accent-pink)] transition-colors"
          >
            <MonoLabel size="label">See all →</MonoLabel>
          </button>
        )}
      </div>

      {/* Timeline area */}
      <div className="relative">
        {/* Year axis — always across the top, full width */}
        <div className="flex justify-between mb-3">
          {years.map(y => (
            <MonoLabel key={y} size="micro" colour="ghost" className="flex-1 text-center">
              {y >= 2000 ? `'${String(y).slice(-2)}` : y}
            </MonoLabel>
          ))}
        </div>

        {/* Wine rows — label above bar */}
        <div className="space-y-2">
          {visibleWindows.map((w) => (
            <div key={w.wineId}>
              <div
                className="overflow-hidden cursor-pointer hover:text-[var(--rc-accent-pink)] mb-0.5"
                onClick={() => onWineTap(w.wineId)}
              >
                <Body size="caption" as="span" truncate>
                  {w.vintage} {w.producer}
                </Body>
              </div>
              <div className="relative">
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
            style={{ left: `${currentYearPct}%` }}
          >
            <div className="h-full border-l-2 border-dashed border-[var(--rc-accent-pink)] opacity-60" />
            <div className="absolute -top-5 -translate-x-1/2 bg-[var(--rc-accent-pink)] text-white px-1.5 py-0.5 rounded-full">
              <MonoLabel size="micro" colour="on-accent">'{String(currentYear).slice(-2)}</MonoLabel>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-[var(--rc-border-subtle)]">
        <Chip variant="Maturity" state="Selected" maturityValue="drink-now" label="Drink now" onClick={() => onChipClick?.('Drink Now')} />
        <Chip variant="Maturity" state="Selected" maturityValue="hold" label="Hold" onClick={() => onChipClick?.('Hold')} />
        <Chip variant="Maturity" state="Selected" maturityValue="past-peak" label="Past peak" onClick={() => onChipClick?.('Past Peak')} />
      </div>
    </Card>
  );
};

export default DrinkingWindowTimeline;
