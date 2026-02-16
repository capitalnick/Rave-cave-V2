import React from 'react';
import OccasionCard from './OccasionCard';
import { OCCASIONS } from '@/constants';
import { PageHeader } from '@/components/rc';
import type { OccasionId } from '@/types';

interface OccasionGridProps {
  onSelectOccasion: (id: OccasionId) => void;
  cellarEmpty: boolean;
}

const OccasionGrid: React.FC<OccasionGridProps> = ({
  onSelectOccasion,
  cellarEmpty,
}) => {
  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10 h-full overflow-y-auto">
      {/* Header */}
      <PageHeader title="RECOMMEND" subtitle="WHAT'S THE OCCASION?" />

      {/* Standard grid (no flags) */}
      <div className="grid grid-cols-2 gap-4">
        {OCCASIONS.filter(o => !o.featured && !o.primary).map((occasion) => (
          <OccasionCard
            key={occasion.id}
            occasion={occasion}
            onClick={() => onSelectOccasion(occasion.id)}
            disabled={cellarEmpty}
          />
        ))}
      </div>

      {/* Primary cards (full-width standard) */}
      {OCCASIONS.filter(o => o.primary).map((occasion) => (
        <OccasionCard
          key={occasion.id}
          occasion={occasion}
          onClick={() => onSelectOccasion(occasion.id)}
          disabled={cellarEmpty}
        />
      ))}

      {/* Featured cards (full-width horizontal) */}
      {OCCASIONS.filter(o => o.featured).map((occasion) => (
        <OccasionCard
          key={occasion.id}
          occasion={occasion}
          onClick={() => onSelectOccasion(occasion.id)}
          disabled={cellarEmpty}
        />
      ))}

      {cellarEmpty && (
        <MonoLabel size="micro" colour="ghost" align="centre" as="p">
          Add bottles to your cellar to unlock recommendations
        </MonoLabel>
      )}
    </div>
  );
};

export default OccasionGrid;
