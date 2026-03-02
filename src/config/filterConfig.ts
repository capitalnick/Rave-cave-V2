/** Price filter buckets for cellar faceted search */
export const PRICE_BUCKETS: { label: string; test: (p: number) => boolean }[] = [
  { label: 'Under $30', test: (p) => p < 30 },
  { label: '$30-$60', test: (p) => p >= 30 && p < 60 },
  { label: '$60-$100', test: (p) => p >= 60 && p < 100 },
  { label: '$100+', test: (p) => p >= 100 },
];
