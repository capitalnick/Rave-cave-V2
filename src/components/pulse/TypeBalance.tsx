import React from 'react';

import { Card, Heading, Chip, InlineMessage } from '@/components/rc';

interface TypeBalanceProps {
  distribution: Record<string, number>;
  onChipClick?: (value: string) => void;
}

const WINE_TYPE_CSS_VARS: Record<string, string> = {
  'Red': 'var(--rc-wine-red)',
  'White': 'var(--rc-wine-white)',
  'Rosé': 'var(--rc-wine-rose)',
  'Sparkling': 'var(--rc-wine-sparkling)',
  'Dessert': 'var(--rc-wine-dessert)',
  'Fortified': 'var(--rc-accent-pink)',
  'Orange': 'var(--rc-wine-orange)',
};

const TypeBalance: React.FC<TypeBalanceProps> = ({ distribution, onChipClick }) => {
  const entries = (Object.entries(distribution) as [string, number][])
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const hasData = total > 0;

  return (
    <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-subtle)]">
      <Heading scale="subhead" className="mb-4 pb-2 border-b-4 border-[var(--rc-accent-pink)]">
        TYPE BALANCE
      </Heading>

      {!hasData ? (
        <InlineMessage tone="info" message="Add bottles to see type balance" />
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex h-6 rounded-full overflow-hidden">
            {entries.map(([type, count]) => (
              <div
                key={type}
                style={{
                  width: `${(count / total) * 100}%`,
                  backgroundColor: WINE_TYPE_CSS_VARS[type] || 'var(--rc-ink-ghost)',
                }}
                className="transition-all duration-300"
              />
            ))}
          </div>

          {/* Chip legend */}
          <div className="flex flex-wrap gap-2 mt-4">
            {entries.map(([type, count]) => (
              <Chip
                key={type}
                variant="WineType"
                state="Selected"
                label={`${type} ${count}`}
                indicatorColor={WINE_TYPE_CSS_VARS[type] || 'var(--rc-ink-ghost)'}
                onClick={() => onChipClick?.(type)}
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

export default TypeBalance;
