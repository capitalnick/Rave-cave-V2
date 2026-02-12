import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { MaturityBreakdown } from '@/types';
import { Card, Heading, Chip, InlineMessage } from '@/components/rc';

interface MaturityDonutProps {
  breakdown: MaturityBreakdown;
}

const MATURITY_COLORS = {
  drinkNow: 'var(--rc-accent-acid)',
  hold: 'var(--rc-accent-coral)',
  pastPeak: 'var(--rc-ink-ghost)',
};

const MaturityDonut: React.FC<MaturityDonutProps> = ({ breakdown }) => {
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
                <span
                  className="block font-[var(--rc-font-display)] font-black text-[36px] sm:text-[48px] leading-none text-[var(--rc-ink-primary)]"
                >
                  {breakdown.total}
                </span>
                <span className="block font-[var(--rc-font-mono)] text-[9px] uppercase tracking-widest text-[var(--rc-ink-ghost)] mt-1">
                  bottles
                </span>
              </div>
            </div>
          </div>

          {/* Chip legend */}
          <div className="flex flex-wrap gap-2 mt-4">
            {breakdown.drinkNow > 0 && (
              <Chip variant="Maturity" state="Selected" maturityValue="drink-now" label={`Drink Now ${breakdown.drinkNow}`} />
            )}
            {breakdown.hold > 0 && (
              <Chip variant="Maturity" state="Selected" maturityValue="hold" label={`Hold ${breakdown.hold}`} />
            )}
            {breakdown.pastPeak > 0 && (
              <Chip variant="Maturity" state="Selected" maturityValue="past-peak" label={`Past Peak ${breakdown.pastPeak}`} />
            )}
          </div>
        </>
      )}
    </Card>
  );
};

export default MaturityDonut;
