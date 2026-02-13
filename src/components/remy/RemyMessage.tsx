import React from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { parseRemyContent } from '@/utils/remyParser';
import type { RemyWineData } from '@/utils/remyParser';
import type { Message, Wine } from '@/types';
import RemyMarkdown from './RemyMarkdown';
import RemyWineCard from './RemyWineCard';

/** Fuzzy match a Remy wine suggestion against the cellar inventory. */
function findCellarMatch(remy: RemyWineData, inventory: Wine[]): Wine | undefined {
  const producer = (remy.producer || '').toLowerCase().trim();
  const vintage = remy.vintage ? Number(remy.vintage) : null;

  for (const wine of inventory) {
    const cellarProducer = wine.producer.toLowerCase().trim();
    const cellarVintage = Number(wine.vintage);

    const producerMatch = cellarProducer.includes(producer) || producer.includes(cellarProducer);
    if (producerMatch && (vintage === null || cellarVintage === vintage)) {
      return wine;
    }
  }
  return undefined;
}

interface RemyMessageProps {
  message: Message;
  inventory?: Wine[];
  onAddToCellar?: (wine: RemyWineData) => void;
  onViewWine?: (wine: Wine) => void;
}

const RemyMessage: React.FC<RemyMessageProps> = ({ message, inventory, onAddToCellar, onViewWine }) => {
  const reduced = useReducedMotion();
  const segments = parseRemyContent(message.content);

  return (
    <div className="flex justify-start">
      <motion.div
        className="relative max-w-[720px] w-full rounded-[20px] p-6 bg-[var(--rc-surface-secondary)] shadow-[var(--rc-shadow-sheet)]"
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Left accent rail */}
        <div
          className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-[var(--rc-accent-pink)]"
        />

        {/* Content area */}
        <div className="pl-3">
          {segments.map((segment, i) => {
            if (segment.type === 'markdown') {
              return <RemyMarkdown key={i} content={segment.text} />;
            }
            return (
              <div key={i}>
                {segment.wines.map((wine, j) => {
                  const match = inventory ? findCellarMatch(wine, inventory) : undefined;
                  return (
                    <RemyWineCard
                      key={j}
                      wine={wine}
                      index={j}
                      cellarMatch={match}
                      onViewWine={onViewWine}
                      onAddToCellar={onAddToCellar}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default RemyMessage;
