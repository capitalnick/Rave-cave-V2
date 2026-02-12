import React from 'react';
import { Card, Heading, MonoLabel } from '@/components/rc';

interface KPIRowProps {
  totalBottles: number;
  totalValue: number;
  bottlesNeedingAttention: number;
  readyToDrinkCount: number;
  averageBottleValue: number;
}

const KPIRow: React.FC<KPIRowProps> = ({ totalBottles, totalValue, bottlesNeedingAttention, readyToDrinkCount, averageBottleValue }) => {
  const hasAttention = bottlesNeedingAttention > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {/* Bottles */}
      <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-subtle)]">
        <Heading scale="subhead" className="mb-4 pb-2 border-b-4 border-[var(--rc-accent-acid)]">
          BOTTLES
        </Heading>
        <Heading
          scale="hero"
          as="span"
          className="block"
        >
          {totalBottles}
        </Heading>
        <MonoLabel size="micro" colour="ghost" className="mt-2">
          REGISTERED
        </MonoLabel>
        {readyToDrinkCount > 0 && (
          <MonoLabel size="micro" colour="accent-acid" className="mt-1">
            {readyToDrinkCount} READY NOW
          </MonoLabel>
        )}
      </Card>

      {/* Value */}
      <Card
        elevation="flat"
        padding="standard"
        className="border border-[var(--rc-border-emphasis)] bg-[var(--rc-accent-pink)] shadow-[6px_6px_0_rgba(0,0,0,1)]"
      >
        <Heading scale="subhead" colour="on-accent" className="mb-4 pb-2 border-b-4 border-white/30">
          VALUE
        </Heading>
        <Heading
          scale="hero"
          colour="on-accent"
          as="span"
          className="block"
        >
          ${totalValue.toLocaleString()}
        </Heading>
        <MonoLabel size="micro" colour="on-accent" className="mt-2 opacity-70">
          ESTIMATED
        </MonoLabel>
        {averageBottleValue > 0 && (
          <MonoLabel size="micro" colour="on-accent" className="mt-1 opacity-70">
            ${Math.round(averageBottleValue)} AVG/BOTTLE
          </MonoLabel>
        )}
      </Card>

      {/* Attention */}
      <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-subtle)]">
        <Heading
          scale="subhead"
          className={`mb-4 pb-2 border-b-4 ${hasAttention ? 'border-[var(--rc-accent-coral)]' : 'border-[var(--rc-accent-acid)]'}`}
        >
          ATTENTION
        </Heading>
        <Heading
          scale="hero"
          as="span"
          colour={hasAttention ? 'accent-coral' : 'accent-acid'}
          className="block"
        >
          {hasAttention ? bottlesNeedingAttention : '0'}
        </Heading>
        <MonoLabel size="micro" colour="ghost" className="mt-2">
          {hasAttention ? 'PAST PEAK' : 'ALL CLEAR'}
        </MonoLabel>
      </Card>
    </div>
  );
};

export default KPIRow;
