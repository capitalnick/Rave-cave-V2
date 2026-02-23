import React from 'react';
import { Card, Heading, MonoLabel } from '@/components/rc';

interface KPIRowProps {
  totalBottles: number;
  totalValue: number;
  bottlesNeedingAttention: number;
  readyToDrinkCount: number;
  averageBottleValue: number;
  currencySymbol: string;
}

const KPIRow: React.FC<KPIRowProps> = ({ totalBottles, totalValue, bottlesNeedingAttention, readyToDrinkCount, averageBottleValue, currencySymbol }) => {
  const hasAttention = bottlesNeedingAttention > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {/* Bottles */}
      <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-subtle)]">
        <Heading scale="subhead" className="mb-4 pb-2 border-b-4 border-[var(--rc-accent-acid)]">
          BOTTLE COUNT
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
          CELLAR VALUE
        </Heading>
        <Heading
          scale="hero"
          colour="on-accent"
          as="span"
          className="block"
        >
          {currencySymbol}{totalValue.toLocaleString()}
        </Heading>
        <MonoLabel size="micro" colour="on-accent" className="mt-2 opacity-70">
          ESTIMATED
        </MonoLabel>
        {averageBottleValue > 0 && (
          <MonoLabel size="micro" colour="on-accent" className="mt-1 opacity-70">
            {currencySymbol}{Math.round(averageBottleValue)} AVG/BOTTLE
          </MonoLabel>
        )}
      </Card>

      {/* Attention */}
      <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-subtle)]">
        <Heading
          scale="subhead"
          className={`mb-4 pb-2 border-b-4 ${hasAttention ? 'border-[var(--rc-accent-coral)]' : 'border-[var(--rc-accent-acid)]'}`}
        >
          SIGNATURE PRODUCERS
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
          {hasAttention ? 'Past peak' : 'ALL CLEAR'}
        </MonoLabel>
      </Card>
    </div>
  );
};

export default KPIRow;
