import React, { useCallback, useRef } from 'react';
import { MonoLabel } from './typography';
import { positionToPrice, priceToPosition, MAX_POSITION, ABSOLUTE_MAX_PRICE } from '@/utils/priceSlider';

export interface PriceRangeSliderProps {
  value: { min: number; max: number };
  onChange: (value: { min: number; max: number }) => void;
  absoluteMax?: number;
}

export const PriceRangeSlider: React.FC<PriceRangeSliderProps> = ({
  value,
  onChange,
  absoluteMax = ABSOLUTE_MAX_PRICE,
}) => {
  const minPos = priceToPosition(value.min);
  const maxPos = priceToPosition(value.max);
  const isFullRange = value.min === 0 && value.max >= absoluteMax;

  // Track which thumb was most recently interacted with for z-index
  const lastTouchedRef = useRef<'min' | 'max'>('max');

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pos = Number(e.target.value);
      const price = positionToPrice(pos);
      lastTouchedRef.current = 'min';
      onChange({ min: Math.min(price, value.max), max: value.max });
    },
    [onChange, value.max],
  );

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pos = Number(e.target.value);
      const price = positionToPrice(pos);
      lastTouchedRef.current = 'max';
      onChange({ min: value.min, max: Math.max(price, value.min) });
    },
    [onChange, value.min],
  );

  const handleClear = useCallback(() => {
    onChange({ min: 0, max: absoluteMax });
  }, [onChange, absoluteMax]);

  // Track percentages for the fill bar
  const minPct = (minPos / MAX_POSITION) * 100;
  const maxPct = (maxPos / MAX_POSITION) * 100;

  const valueLabel = isFullRange
    ? 'Any price'
    : `$${value.min} – $${value.max}`;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-baseline justify-between">
        <MonoLabel size="label" colour="secondary" className="w-auto">
          PRICE PER BOTTLE
        </MonoLabel>
        <div className="flex items-baseline gap-3">
          <span className="font-[var(--rc-font-display)] text-sm font-bold text-[var(--rc-ink-primary)]">
            {valueLabel}
          </span>
          {!isFullRange && (
            <button
              type="button"
              onClick={handleClear}
              className="font-[var(--rc-font-mono)] text-[10px] uppercase tracking-wider text-[var(--rc-accent-pink)] hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Slider track */}
      <div className="relative h-[22px]">
        {/* Inactive track */}
        <div
          className="absolute top-1/2 left-0 right-0 -translate-y-1/2 rounded-full"
          style={{
            height: 3,
            backgroundColor: 'var(--rc-border-subtle)',
          }}
        />
        {/* Active fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full"
          style={{
            height: 3,
            left: `${minPct}%`,
            right: `${100 - maxPct}%`,
            backgroundColor: 'var(--rc-accent-pink)',
          }}
        />

        {/* Min thumb */}
        <input
          type="range"
          min={0}
          max={MAX_POSITION}
          value={minPos}
          onChange={handleMinChange}
          onPointerDown={() => { lastTouchedRef.current = 'min'; }}
          className="price-range-thumb"
          style={{ zIndex: lastTouchedRef.current === 'min' ? 4 : 3 }}
          aria-label="Minimum price"
        />

        {/* Max thumb */}
        <input
          type="range"
          min={0}
          max={MAX_POSITION}
          value={maxPos}
          onChange={handleMaxChange}
          onPointerDown={() => { lastTouchedRef.current = 'max'; }}
          className="price-range-thumb"
          style={{ zIndex: lastTouchedRef.current === 'max' ? 4 : 3 }}
          aria-label="Maximum price"
        />
      </div>

      {/* Footer labels */}
      <div className="flex justify-between">
        <span className="font-[var(--rc-font-mono)] text-[9px] text-[var(--rc-ink-ghost)]">$0</span>
        <span className="font-[var(--rc-font-mono)] text-[9px] text-[var(--rc-ink-ghost)]">$200+</span>
      </div>

      {/* Scoped styles for range inputs */}
      <style>{`
        .price-range-thumb {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 22px;
          margin: 0;
          padding: 0;
          background: none;
          pointer-events: none;
          -webkit-appearance: none;
          appearance: none;
        }
        .price-range-thumb::-webkit-slider-runnable-track {
          height: 0;
          background: transparent;
        }
        .price-range-thumb::-moz-range-track {
          height: 0;
          background: transparent;
        }
        .price-range-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--rc-surface-elevated, #fff);
          border: 2px solid var(--rc-accent-pink);
          box-shadow: var(--rc-shadow-card, 0 1px 3px rgba(0,0,0,0.12));
          pointer-events: auto;
          cursor: pointer;
          margin-top: 0;
        }
        .price-range-thumb::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--rc-surface-elevated, #fff);
          border: 2px solid var(--rc-accent-pink);
          box-shadow: var(--rc-shadow-card, 0 1px 3px rgba(0,0,0,0.12));
          pointer-events: auto;
          cursor: pointer;
        }
        .price-range-thumb:focus {
          outline: none;
        }
        .price-range-thumb:focus-visible::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px var(--rc-accent-pink-alpha, rgba(232,74,111,0.3));
        }
        .price-range-thumb:focus-visible::-moz-range-thumb {
          box-shadow: 0 0 0 3px var(--rc-accent-pink-alpha, rgba(232,74,111,0.3));
        }
      `}</style>
    </div>
  );
};
