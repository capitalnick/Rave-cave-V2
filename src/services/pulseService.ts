import type { Wine, WineType, MaturityBreakdown, DrinkingWindow, StoryCard, PulseStats } from '@/types';
import type { Currency } from '@/context/ProfileContext';
import { formatPrice } from '@/lib/formatPrice';

const currentYear = new Date().getFullYear();

type CleanMaturity = 'Drink Now' | 'Hold' | 'Past Peak' | 'unknown';

function getCleanMaturity(drinkFrom: number, drinkUntil: number): CleanMaturity {
  const from = Number(drinkFrom);
  const until = Number(drinkUntil);
  if (isNaN(from) || isNaN(until) || from === 0 || until === 0) return 'unknown';
  if (currentYear >= from && currentYear <= until) return 'Drink Now';
  if (currentYear < from) return 'Hold';
  return 'Past Peak';
}

export function computeMaturityBreakdown(inventory: Wine[]): MaturityBreakdown {
  const breakdown: MaturityBreakdown = { drinkNow: 0, hold: 0, pastPeak: 0, unknown: 0, total: 0 };
  for (const wine of inventory) {
    const qty = Number(wine.quantity) || 0;
    const status = getCleanMaturity(wine.drinkFrom, wine.drinkUntil);
    switch (status) {
      case 'Drink Now': breakdown.drinkNow += qty; break;
      case 'Hold': breakdown.hold += qty; break;
      case 'Past Peak': breakdown.pastPeak += qty; break;
      default: breakdown.unknown += qty;
    }
    breakdown.total += qty;
  }
  return breakdown;
}

export function computeDrinkingWindows(inventory: Wine[]): DrinkingWindow[] {
  return inventory
    .filter(w => {
      const from = Number(w.drinkFrom);
      const until = Number(w.drinkUntil);
      return !isNaN(from) && !isNaN(until) && from > 0 && until > 0;
    })
    .map(w => ({
      wineId: w.id,
      producer: w.producer,
      name: w.name,
      vintage: w.vintage,
      type: w.type,
      drinkFrom: Number(w.drinkFrom),
      drinkUntil: Number(w.drinkUntil),
      maturity: getCleanMaturity(w.drinkFrom, w.drinkUntil) === 'unknown' ? 'Hold' : getCleanMaturity(w.drinkFrom, w.drinkUntil) as 'Drink Now' | 'Hold' | 'Past Peak',
      totalValue: (Number(w.price) || 0) * (Number(w.quantity) || 0),
      quantity: Number(w.quantity) || 0,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);
}

export function generateStoryCards(
  inventory: Wine[],
  breakdown: MaturityBreakdown,
  mostValuable: Wine | null,
  typeDistribution: Record<string, number>,
  currency: Currency = 'AUD',
): StoryCard[] {
  const cards: StoryCard[] = [];

  // P1: Past peak alert
  if (breakdown.pastPeak > 0) {
    cards.push({
      id: 'past-peak-alert',
      type: 'past-peak-alert',
      icon: '!!!',
      headline: `${breakdown.pastPeak} bottle${breakdown.pastPeak === 1 ? '' : 's'} past their peak`,
      subtext: 'Time to drink, share, or cook with them.',
      accentColor: 'var(--rc-accent-coral)',
      cta: { label: 'View drinking windows', action: 'view-drinking-window' },
    });
  }

  // P2: Ready to drink
  if (breakdown.drinkNow > 0 && cards.length < 3) {
    cards.push({
      id: 'ready-to-drink',
      type: 'ready-to-drink',
      icon: 'NOW',
      headline: `${breakdown.drinkNow} bottle${breakdown.drinkNow === 1 ? '' : 's'} ready to drink`,
      subtext: 'In their window. Don\'t wait.',
      accentColor: 'var(--rc-accent-acid)',
      cta: { label: 'View drinking windows', action: 'view-drinking-window' },
    });
  }

  // P3: Most valuable
  if (mostValuable && cards.length < 3) {
    cards.push({
      id: 'most-valuable',
      type: 'most-valuable',
      icon: '$',
      headline: `${mostValuable.vintage} ${mostValuable.producer}`,
      subtext: `Your most valuable bottle. ${formatPrice(Number(mostValuable.price), currency)}.`,
      accentColor: 'var(--rc-accent-pink)',
      cta: { label: 'View bottle', action: 'view-wine', payload: mostValuable.id },
    });
  }

  // P4: Cellar diversity
  const typeKeys = Object.keys(typeDistribution).filter(k => typeDistribution[k] > 0);
  if (typeKeys.length > 1 && cards.length < 3) {
    const sorted = typeKeys.sort((a, b) => typeDistribution[b] - typeDistribution[a]);
    cards.push({
      id: 'cellar-diversity',
      type: 'cellar-diversity',
      icon: 'MIX',
      headline: `${typeKeys.length} styles in your cellar`,
      subtext: `From ${sorted[0]} to ${sorted[sorted.length - 1]}.`,
      accentColor: 'var(--rc-ink-primary)',
      cta: { label: 'Explore', action: 'view-story', payload: 'cellar-diversity' },
    });
  }

  // P5: Aging potential
  if (breakdown.hold > 0 && cards.length < 3) {
    cards.push({
      id: 'aging-potential',
      type: 'aging-potential',
      icon: 'WAIT',
      headline: `${breakdown.hold} bottle${breakdown.hold === 1 ? '' : 's'} still aging`,
      subtext: 'Your patience portfolio.',
      accentColor: 'var(--rc-ink-primary)',
      cta: { label: 'Explore', action: 'view-story', payload: 'aging-potential' },
    });
  }

  return cards.slice(0, 3);
}

export function computeTopProducers(inventory: Wine[]): { name: string; count: number; totalValue: number }[] {
  const map: Record<string, { count: number; totalValue: number }> = {};
  for (const wine of inventory) {
    if (!wine.producer) continue;
    const qty = Number(wine.quantity) || 0;
    const val = (Number(wine.price) || 0) * qty;
    if (!map[wine.producer]) map[wine.producer] = { count: 0, totalValue: 0 };
    map[wine.producer].count += qty;
    map[wine.producer].totalValue += val;
  }
  return Object.entries(map)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function computeTypeDistribution(inventory: Wine[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const wine of inventory) {
    const type = wine.type || 'Unknown';
    dist[type] = (dist[type] || 0) + (Number(wine.quantity) || 0);
  }
  return dist;
}

export function computeTimelineRange(windows: DrinkingWindow[]): { min: number; max: number } {
  if (windows.length === 0) return { min: currentYear, max: currentYear + 10 };
  let min = Infinity;
  let max = -Infinity;
  for (const w of windows) {
    if (w.drinkFrom < min) min = w.drinkFrom;
    if (w.drinkUntil > max) max = w.drinkUntil;
  }
  // Ensure current year is visible
  if (min > currentYear) min = currentYear;
  if (max < currentYear) max = currentYear;
  return { min, max };
}

export function computePulseStats(inventory: Wine[], currency: Currency = 'AUD'): PulseStats {
  const maturityBreakdown = computeMaturityBreakdown(inventory);
  const drinkingWindows = computeDrinkingWindows(inventory);
  const typeDistribution = computeTypeDistribution(inventory);
  const topProducers = computeTopProducers(inventory);
  const timelineRange = computeTimelineRange(drinkingWindows);

  const totalBottles = inventory.reduce((sum, w) => sum + (Number(w.quantity) || 0), 0);
  const totalValue = inventory.reduce((sum, w) => sum + ((Number(w.price) || 0) * (Number(w.quantity) || 0)), 0);

  // Most valuable single bottle (by unit price)
  const mostValuableWine = inventory.length > 0
    ? inventory.reduce((best, w) => (Number(w.price) || 0) > (Number(best.price) || 0) ? w : best, inventory[0])
    : null;

  const storyCards = generateStoryCards(inventory, maturityBreakdown, mostValuableWine, typeDistribution, currency);

  return {
    totalBottles,
    totalValue,
    typeDistribution,
    topProducers,
    maturityBreakdown,
    drinkingWindows,
    storyCards,
    bottlesNeedingAttention: maturityBreakdown.pastPeak,
    readyToDrinkCount: maturityBreakdown.drinkNow,
    mostValuableWine,
    averageBottleValue: totalBottles > 0 ? totalValue / totalBottles : 0,
    timelineRange,
  };
}
