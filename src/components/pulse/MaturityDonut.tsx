import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { MaturityBreakdown } from '@/types';
import { Card, Heading, Chip, MonoLabel, InlineMessage } from '@/components/rc';

interface MaturityDonutProps {
  breakdown: MaturityBreakdown;
  onChipClick?: (value: string) => void;
}

const MATURITY_COLORS = {
  drinkNow: 'var(--rc-maturity-drink-now)',
  hold: 'var(--rc-maturity-hold)',
  pastPeak: 'var(--rc-maturity-past-peak)',
};

const MaturityDonut: React.FC<MaturityDonutProps> = ({ breakdown, onChipClick }) => {
  const hasData = breakdown.drinkNow + breakdown.hold + breakdown.pastPeak > 0;

  const data = [
    { name: 'Drink Now', value: breakdown.drinkNow, color: MATURITY_COLORS.drinkNow },
    { name: 'Hold', value: breakdown.hold, color: MATURITY_COLORS.hold },
    { name: 'Past Peak', value: breakdown.pastPeak, color: MATURITY_COLORS.pastPeak },
  ].filter(d => d.value > 0);

  return (
    <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-subtle)]">
      <Heading scale="subhead" className="mb-4 pb-2 border-b-4 border-[var(--rc-accent-acid)]">
        MATURITY BREAKDOWN
      </Heading>

      {!hasData ? (
        <InlineMessage tone="info" message="Add drinking windows to see maturity data" />
      ) : (
        <>
          <div className="relative h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Heading scale="title" as="span" className="block">
                  {breakdown.total}
                </Heading>
                <MonoLabel size="micro" colour="ghost" className="block mt-1">
                  bottles
                </MonoLabel>
              </div>
            </div>
          </div>

          {/* Chip legend */}
          <div className="flex flex-wrap gap-2 mt-4">
            {breakdown.drinkNow > 0 && (
              <Chip variant="Maturity" state="Selected" maturityValue="drink-now" label={`Drink now ${breakdown.drinkNow}`} onClick={() => onChipClick?.('Drink Now')} />
            )}
            {breakdown.hold > 0 && (
              <Chip variant="Maturity" state="Selected" maturityValue="hold" label={`Hold ${breakdown.hold}`} onClick={() => onChipClick?.('Hold')} />
            )}
            {breakdown.pastPeak > 0 && (
              <Chip variant="Maturity" state="Selected" maturityValue="past-peak" label={`Past peak ${breakdown.pastPeak}`} onClick={() => onChipClick?.('Past Peak')} />
            )}
          </div>
        </>
      )}
    </Card>
  );
};

export default MaturityDonut;
