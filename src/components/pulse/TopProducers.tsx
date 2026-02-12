import React from 'react';
import { Card, Heading, Body, MonoLabel, InlineMessage } from '@/components/rc';

interface TopProducersProps {
  producers: { name: string; count: number; totalValue: number }[];
}

const TopProducers: React.FC<TopProducersProps> = ({ producers }) => {
  if (producers.length === 0) {
    return (
      <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-subtle)]">
        <Heading scale="subhead" className="mb-4 pb-2 border-b-4 border-[var(--rc-accent-acid)]">
          CORE PRODUCERS
        </Heading>
        <InlineMessage tone="info" message="Add bottles to see producer breakdown" />
      </Card>
    );
  }

  const maxCount = producers[0]?.count || 1;

  return (
    <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-subtle)]">
      <Heading scale="subhead" className="mb-4 pb-2 border-b-4 border-[var(--rc-accent-acid)]">
        CORE PRODUCERS
      </Heading>

      <div className="space-y-3">
        {producers.map((p) => (
          <div key={p.name} className="space-y-1">
            <div className="flex justify-between items-baseline">
              <Body size="caption" weight="medium" className="truncate max-w-[70%]">
                {p.name}
              </Body>
              <MonoLabel size="label" colour="ghost">
                {p.count}
              </MonoLabel>
            </div>
            <div className="h-3 bg-[var(--rc-surface-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--rc-accent-pink)] rounded-full transition-all duration-500"
                style={{ width: `${(p.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TopProducers;
