import React from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { parseRemyContent } from '@/utils/remyParser';
import type { RemyWineData } from '@/utils/remyParser';
import type { Message } from '@/types';
import RemyMarkdown from './RemyMarkdown';
import RemyWineCard from './RemyWineCard';

interface RemyMessageProps {
  message: Message;
  onAddToCellar?: (wine: RemyWineData) => void;
}

const RemyMessage: React.FC<RemyMessageProps> = ({ message, onAddToCellar }) => {
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
                {segment.wines.map((wine, j) => (
                  <RemyWineCard
                    key={j}
                    wine={wine}
                    index={j}
                    onAddToCellar={onAddToCellar}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default RemyMessage;
