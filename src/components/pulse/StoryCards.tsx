import React from 'react';
import { motion } from 'motion/react';
import type { StoryCard } from '@/types';
import { Card, Heading, Body, MonoLabel } from '@/components/rc';

interface StoryCardsProps {
  cards: StoryCard[];
  onCardTap: (card: StoryCard) => void;
}

const StoryCards: React.FC<StoryCardsProps> = ({ cards, onCardTap }) => {
  if (cards.length === 0) return null;

  return (
    <div className="space-y-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.35, ease: [0.2, 0, 0, 1] }}
        >
          <Card
            elevation="flat"
            padding="standard"
            onClick={() => onCardTap(card)}
            className="border border-[var(--rc-border-subtle)] cursor-pointer relative overflow-hidden"
          >
            {/* 3px left accent bar */}
            <div
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{ backgroundColor: card.accentColor }}
            />

            <div className="flex items-start gap-3 pl-2">
              {/* Icon marker */}
              <div
                className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-sm"
                style={{ backgroundColor: card.accentColor }}
              >
                <MonoLabel
                  size="micro"
                  weight="bold"
                  colour={card.accentColor === 'var(--rc-ink-primary)' ? 'on-accent' : 'primary'}
                  className="w-auto! text-center!"
                  uppercase={false}
                >
                  {card.icon}
                </MonoLabel>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <Heading scale="subhead" className="mb-1">
                  {card.headline}
                </Heading>
                <Body size="caption" colour="secondary" className="mb-2">
                  {card.subtext}
                </Body>
                {card.cta && (
                  <MonoLabel
                    size="micro"
                    weight="bold"
                    colour="primary"
                    className="underline underline-offset-2 w-auto!"
                  >
                    {card.cta.label}
                  </MonoLabel>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default StoryCards;
