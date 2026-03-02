import type { Wine } from '@/types';
import { formatGrapeDisplay } from '@/utils/grapeUtils';
import { getMaturityKebab } from '@/utils/maturityUtils';

/**
 * Wine type mapping: existing PascalCase -> RC UI Set lowercase.
 * 'Fortified' has no RC equivalent; maps to 'red' (closest visual match).
 */
type RCWineType = 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'orange';

const WINE_TYPE_MAP: Record<string, RCWineType> = {
  'Red': 'red',
  'White': 'white',
  'Rosé': 'rose',
  'Sparkling': 'sparkling',
  'Dessert': 'dessert',
  'Fortified': 'red',
};

/**
 * Adapts existing Wine type to RC WineCard-compatible shape.
 */
export function toRCWineType(wineType: string): RCWineType {
  return WINE_TYPE_MAP[wineType] || 'red';
}

/**
 * Adapts a Wine object to the props shape expected by RC WineCard.
 */
export function toRCWineCardProps(wine: Wine) {
  return {
    id: wine.id,
    producer: wine.producer,
    varietal: formatGrapeDisplay(wine.grapeVarieties) || wine.type,
    vintage: String(wine.vintage),
    type: toRCWineType(wine.type),
    maturity: getMaturityKebab(wine.drinkFrom, wine.drinkUntil),
    image: wine.thumbnailUrl || wine.resolvedImageUrl || wine.imageUrl || '',
  };
}
