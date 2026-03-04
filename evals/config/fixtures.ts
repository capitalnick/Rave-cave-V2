/**
 * Eval Harness — Wine Fixtures
 *
 * 30-wine cellar covering: Red/White/Rosé/Sparkling/Dessert/Fortified,
 * 7 countries, $18-$365, Hold/Drink Now/Past Peak, diverse grapes.
 */

export interface FixtureWine {
  id: string;
  producer: string;
  name: string;
  vintage: number;
  type: string;
  region: string;
  country: string;
  appellation: string;
  grapeVarieties: { name: string; pct?: number | null }[];
  price: number;
  quantity: number;
  tastingNotes: string;
  vivinoRating: number;
  drinkFrom: number;
  drinkUntil: number;
  maturity: string;
  priceCurrency: string;
}

const currentYear = new Date().getFullYear();

function computeMaturity(drinkFrom: number, drinkUntil: number): string {
  if (!drinkFrom || !drinkUntil) return 'Unknown';
  if (currentYear >= drinkFrom && currentYear <= drinkUntil) return 'Drink Now';
  if (currentYear < drinkFrom) return 'Hold';
  return 'Past Peak';
}

export const FIXTURE_WINES: FixtureWine[] = [
  // ── REDS (12) ──
  {
    id: 'w01', producer: 'Penfolds', name: 'Bin 389', vintage: 2019,
    type: 'Red', region: 'South Australia', country: 'Australia',
    appellation: 'Multi-regional blend', grapeVarieties: [{ name: 'Cabernet Sauvignon', pct: 53 }, { name: 'Shiraz', pct: 47 }],
    price: 85, quantity: 3, tastingNotes: 'Blackcurrant, dark chocolate, cedary oak, firm tannins',
    vivinoRating: 91, drinkFrom: 2023, drinkUntil: 2035, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w02', producer: 'Château Margaux', name: '', vintage: 2015,
    type: 'Red', region: 'Bordeaux', country: 'France',
    appellation: 'Margaux', grapeVarieties: [{ name: 'Cabernet Sauvignon', pct: 87 }, { name: 'Merlot', pct: 8 }, { name: 'Petit Verdot', pct: 5 }],
    price: 365, quantity: 1, tastingNotes: 'Violet, cassis, graphite, silky tannins, extraordinary length',
    vivinoRating: 98, drinkFrom: 2028, drinkUntil: 2060, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w03', producer: 'Domaine de la Romanée-Conti', name: 'Échezeaux', vintage: 2018,
    type: 'Red', region: 'Burgundy', country: 'France',
    appellation: 'Échezeaux Grand Cru', grapeVarieties: [{ name: 'Pinot Noir' }],
    price: 320, quantity: 1, tastingNotes: 'Rose petal, dark cherry, forest floor, ethereal texture',
    vivinoRating: 96, drinkFrom: 2024, drinkUntil: 2045, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w04', producer: 'Henschke', name: 'Hill of Grace', vintage: 2017,
    type: 'Red', region: 'Eden Valley', country: 'Australia',
    appellation: 'Eden Valley', grapeVarieties: [{ name: 'Shiraz' }],
    price: 350, quantity: 1, tastingNotes: 'Blackberry, smoked meat, dark spice, velvety tannins, persistent finish',
    vivinoRating: 97, drinkFrom: 2023, drinkUntil: 2050, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w05', producer: 'Torbreck', name: 'RunRig', vintage: 2019,
    type: 'Red', region: 'Barossa Valley', country: 'Australia',
    appellation: 'Barossa Valley', grapeVarieties: [{ name: 'Shiraz', pct: 97 }, { name: 'Viognier', pct: 3 }],
    price: 180, quantity: 2, tastingNotes: 'Plum, violets, licorice, cracked pepper, dense and concentrated',
    vivinoRating: 95, drinkFrom: 2024, drinkUntil: 2040, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w06', producer: 'Cloudy Bay', name: '', vintage: 2020,
    type: 'Red', region: 'Central Otago', country: 'New Zealand',
    appellation: 'Central Otago', grapeVarieties: [{ name: 'Pinot Noir' }],
    price: 45, quantity: 4, tastingNotes: 'Red cherry, thyme, earthy, silky palate, medium body',
    vivinoRating: 88, drinkFrom: 2022, drinkUntil: 2027, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w07', producer: 'Antinori', name: 'Tignanello', vintage: 2019,
    type: 'Red', region: 'Tuscany', country: 'Italy',
    appellation: 'Toscana IGT', grapeVarieties: [{ name: 'Sangiovese', pct: 80 }, { name: 'Cabernet Sauvignon', pct: 15 }, { name: 'Cabernet Franc', pct: 5 }],
    price: 130, quantity: 2, tastingNotes: 'Morello cherry, tobacco, leather, integrated oak, long finish',
    vivinoRating: 93, drinkFrom: 2023, drinkUntil: 2035, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w08', producer: 'Vega Sicilia', name: 'Unico', vintage: 2012,
    type: 'Red', region: 'Ribera del Duero', country: 'Spain',
    appellation: 'Ribera del Duero', grapeVarieties: [{ name: 'Tempranillo', pct: 94 }, { name: 'Cabernet Sauvignon', pct: 6 }],
    price: 280, quantity: 1, tastingNotes: 'Dried fruits, balsamic, cigar box, complex and layered, silky tannins',
    vivinoRating: 96, drinkFrom: 2022, drinkUntil: 2045, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w09', producer: 'Yellow Tail', name: '', vintage: 2023,
    type: 'Red', region: 'South Eastern Australia', country: 'Australia',
    appellation: '', grapeVarieties: [{ name: 'Shiraz' }],
    price: 18, quantity: 6, tastingNotes: 'Ripe berry, vanilla, soft tannins, easy-drinking',
    vivinoRating: 72, drinkFrom: 2023, drinkUntil: 2025, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w10', producer: 'Domaine Tempier', name: '', vintage: 2020,
    type: 'Red', region: 'Provence', country: 'France',
    appellation: 'Bandol', grapeVarieties: [{ name: 'Mourvèdre', pct: 70 }, { name: 'Grenache', pct: 20 }, { name: 'Cinsault', pct: 10 }],
    price: 65, quantity: 2, tastingNotes: 'Garrigue, dark plum, spice, meaty, structured tannins',
    vivinoRating: 92, drinkFrom: 2024, drinkUntil: 2035, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w11', producer: 'Wynns', name: 'Black Label', vintage: 2019,
    type: 'Red', region: 'Coonawarra', country: 'Australia',
    appellation: 'Coonawarra', grapeVarieties: [{ name: 'Cabernet Sauvignon' }],
    price: 35, quantity: 4, tastingNotes: 'Blackcurrant, mint, eucalyptus, medium body, fine tannins',
    vivinoRating: 89, drinkFrom: 2022, drinkUntil: 2030, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w12', producer: 'Ridge', name: 'Monte Bello', vintage: 2018,
    type: 'Red', region: 'Santa Cruz Mountains', country: 'USA',
    appellation: 'Santa Cruz Mountains', grapeVarieties: [{ name: 'Cabernet Sauvignon', pct: 77 }, { name: 'Merlot', pct: 14 }, { name: 'Petit Verdot', pct: 9 }],
    price: 210, quantity: 1, tastingNotes: 'Cassis, wild herbs, mineral, precise tannins, age-worthy',
    vivinoRating: 95, drinkFrom: 2028, drinkUntil: 2048, maturity: '', priceCurrency: 'AUD',
  },

  // ── WHITES (8) ──
  {
    id: 'w13', producer: 'Domaine Leflaive', name: 'Puligny-Montrachet', vintage: 2020,
    type: 'White', region: 'Burgundy', country: 'France',
    appellation: 'Puligny-Montrachet', grapeVarieties: [{ name: 'Chardonnay' }],
    price: 145, quantity: 2, tastingNotes: 'Citrus, white flowers, chalky minerality, precise acidity',
    vivinoRating: 93, drinkFrom: 2023, drinkUntil: 2032, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w14', producer: 'Grosset', name: 'Polish Hill', vintage: 2022,
    type: 'White', region: 'Clare Valley', country: 'Australia',
    appellation: 'Clare Valley', grapeVarieties: [{ name: 'Riesling' }],
    price: 48, quantity: 3, tastingNotes: 'Lime, slate, floral, laser-like acidity, bone dry',
    vivinoRating: 94, drinkFrom: 2023, drinkUntil: 2035, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w15', producer: 'Cloudy Bay', name: '', vintage: 2023,
    type: 'White', region: 'Marlborough', country: 'New Zealand',
    appellation: 'Marlborough', grapeVarieties: [{ name: 'Sauvignon Blanc' }],
    price: 28, quantity: 5, tastingNotes: 'Passionfruit, gooseberry, fresh herbs, zingy acidity',
    vivinoRating: 87, drinkFrom: 2023, drinkUntil: 2026, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w16', producer: 'Leeuwin Estate', name: 'Art Series', vintage: 2019,
    type: 'White', region: 'Margaret River', country: 'Australia',
    appellation: 'Margaret River', grapeVarieties: [{ name: 'Chardonnay' }],
    price: 95, quantity: 2, tastingNotes: 'White peach, cashew, toasty oak, creamy texture, long finish',
    vivinoRating: 95, drinkFrom: 2022, drinkUntil: 2032, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w17', producer: 'Trimbach', name: 'Cuvée Frédéric Émile', vintage: 2016,
    type: 'White', region: 'Alsace', country: 'France',
    appellation: 'Alsace Grand Cru', grapeVarieties: [{ name: 'Riesling' }],
    price: 75, quantity: 2, tastingNotes: 'Petrol, honey, dried apricot, racy acidity, complex',
    vivinoRating: 94, drinkFrom: 2021, drinkUntil: 2036, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w18', producer: 'Viña Errázuriz', name: 'Max Reserva', vintage: 2022,
    type: 'White', region: 'Aconcagua Costa', country: 'Chile',
    appellation: 'Aconcagua Costa', grapeVarieties: [{ name: 'Chardonnay' }],
    price: 22, quantity: 3, tastingNotes: 'Tropical fruit, vanilla, buttery, medium acidity',
    vivinoRating: 84, drinkFrom: 2023, drinkUntil: 2026, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w19', producer: 'Dog Point', name: 'Section 94', vintage: 2019,
    type: 'White', region: 'Marlborough', country: 'New Zealand',
    appellation: 'Marlborough', grapeVarieties: [{ name: 'Sauvignon Blanc' }],
    price: 38, quantity: 2, tastingNotes: 'Flinty, grapefruit, lemon curd, oak-aged complexity, textural',
    vivinoRating: 91, drinkFrom: 2022, drinkUntil: 2029, maturity: '', priceCurrency: 'AUD',
  },

  // ── ROSÉ (2) ──
  {
    id: 'w20', producer: 'Château d\'Esclans', name: 'Whispering Angel', vintage: 2023,
    type: 'Rosé', region: 'Provence', country: 'France',
    appellation: 'Côtes de Provence', grapeVarieties: [{ name: 'Grenache', pct: 45 }, { name: 'Cinsault', pct: 35 }, { name: 'Rolle', pct: 20 }],
    price: 32, quantity: 4, tastingNotes: 'Strawberry, white peach, saline finish, crisp and dry',
    vivinoRating: 86, drinkFrom: 2023, drinkUntil: 2027, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w21', producer: 'Turkey Flat', name: '', vintage: 2023,
    type: 'Rosé', region: 'Barossa Valley', country: 'Australia',
    appellation: 'Barossa Valley', grapeVarieties: [{ name: 'Grenache' }],
    price: 24, quantity: 3, tastingNotes: 'Raspberry, watermelon, dry, vibrant acidity',
    vivinoRating: 88, drinkFrom: 2023, drinkUntil: 2027, maturity: '', priceCurrency: 'AUD',
  },

  // ── SPARKLING (3) ──
  {
    id: 'w22', producer: 'Dom Pérignon', name: '', vintage: 2013,
    type: 'Sparkling', region: 'Champagne', country: 'France',
    appellation: 'Champagne', grapeVarieties: [{ name: 'Chardonnay', pct: 50 }, { name: 'Pinot Noir', pct: 50 }],
    price: 320, quantity: 1, tastingNotes: 'Brioche, citrus, white flowers, creamy mousse, electric acidity',
    vivinoRating: 96, drinkFrom: 2022, drinkUntil: 2040, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w23', producer: 'Pol Roger', name: 'Brut Réserve', vintage: 0,
    type: 'Sparkling', region: 'Champagne', country: 'France',
    appellation: 'Champagne', grapeVarieties: [{ name: 'Pinot Noir', pct: 33 }, { name: 'Chardonnay', pct: 33 }, { name: 'Pinot Meunier', pct: 34 }],
    price: 75, quantity: 3, tastingNotes: 'Green apple, toast, fine bubbles, elegant and balanced',
    vivinoRating: 90, drinkFrom: 2023, drinkUntil: 2028, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w24', producer: 'Jansz', name: 'Premium Cuvée', vintage: 0,
    type: 'Sparkling', region: 'Tasmania', country: 'Australia',
    appellation: 'Tasmania', grapeVarieties: [{ name: 'Chardonnay', pct: 55 }, { name: 'Pinot Noir', pct: 45 }],
    price: 30, quantity: 4, tastingNotes: 'Citrus, brioche, creamy mousse, refreshing finish',
    vivinoRating: 88, drinkFrom: 2023, drinkUntil: 2026, maturity: '', priceCurrency: 'AUD',
  },

  // ── DESSERT (3) ──
  {
    id: 'w25', producer: 'Château d\'Yquem', name: '', vintage: 2015,
    type: 'Dessert', region: 'Bordeaux', country: 'France',
    appellation: 'Sauternes', grapeVarieties: [{ name: 'Sémillon', pct: 80 }, { name: 'Sauvignon Blanc', pct: 20 }],
    price: 350, quantity: 1, tastingNotes: 'Apricot, honey, saffron, luscious sweetness, endless finish',
    vivinoRating: 98, drinkFrom: 2022, drinkUntil: 2070, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w26', producer: 'De Bortoli', name: 'Noble One', vintage: 2020,
    type: 'Dessert', region: 'Riverina', country: 'Australia',
    appellation: 'Riverina', grapeVarieties: [{ name: 'Sémillon' }],
    price: 35, quantity: 2, tastingNotes: 'Marmalade, peach, botrytis, balanced sweetness, fresh acidity',
    vivinoRating: 90, drinkFrom: 2022, drinkUntil: 2030, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w27', producer: 'Warre\'s', name: 'Vintage Port', vintage: 2011,
    type: 'Dessert', region: 'Douro', country: 'Portugal',
    appellation: 'Porto', grapeVarieties: [{ name: 'Touriga Nacional' }, { name: 'Touriga Franca' }, { name: 'Tinta Roriz' }],
    price: 65, quantity: 2, tastingNotes: 'Blackberry, chocolate, spice, rich and warming, firm structure',
    vivinoRating: 93, drinkFrom: 2023, drinkUntil: 2050, maturity: '', priceCurrency: 'AUD',
  },

  // ── FORTIFIED (2) ──
  {
    id: 'w28', producer: 'Seppeltsfield', name: 'Para Tawny', vintage: 0,
    type: 'Fortified', region: 'Barossa Valley', country: 'Australia',
    appellation: 'Barossa Valley', grapeVarieties: [{ name: 'Grenache' }, { name: 'Shiraz' }],
    price: 55, quantity: 2, tastingNotes: 'Toffee, raisin, walnut, silky, long finish',
    vivinoRating: 91, drinkFrom: 2023, drinkUntil: 2040, maturity: '', priceCurrency: 'AUD',
  },
  {
    id: 'w29', producer: 'Lustau', name: 'Palo Cortado', vintage: 0,
    type: 'Fortified', region: 'Jerez', country: 'Spain',
    appellation: 'Jerez-Xérès-Sherry', grapeVarieties: [{ name: 'Palomino' }],
    price: 28, quantity: 3, tastingNotes: 'Hazelnut, dried orange, saline, oxidative complexity, bone dry',
    vivinoRating: 92, drinkFrom: 2023, drinkUntil: 2035, maturity: '', priceCurrency: 'AUD',
  },

  // ── PAST PEAK (1 — for testing) ──
  {
    id: 'w30', producer: 'Tyrrell\'s', name: 'Vat 1', vintage: 2005,
    type: 'White', region: 'Hunter Valley', country: 'Australia',
    appellation: 'Hunter Valley', grapeVarieties: [{ name: 'Sémillon' }],
    price: 95, quantity: 1, tastingNotes: 'Toast, honey, lemon curd, lanolin, complex aged character',
    vivinoRating: 94, drinkFrom: 2015, drinkUntil: 2025, maturity: '', priceCurrency: 'AUD',
  },
];

// Compute maturity for each wine
FIXTURE_WINES.forEach(w => {
  w.maturity = computeMaturity(w.drinkFrom, w.drinkUntil);
});

/**
 * Builds a cellar summary string matching inventoryService.buildCellarSummary() format.
 * Standalone — no Firestore dependency.
 */
export function buildCellarSnapshot(wines: FixtureWine[] = FIXTURE_WINES): string {
  if (wines.length === 0) return 'Cellar is empty.';

  const totalBottles = wines.reduce((sum, w) => sum + w.quantity, 0);

  // Type breakdown
  const types: Record<string, number> = {};
  wines.forEach(w => { types[w.type] = (types[w.type] || 0) + w.quantity; });
  const typeStr = Object.entries(types).map(([t, n]) => `${t}: ${n}`).join(', ');

  // Top 5 helper
  const top5 = (acc: Record<string, number>) =>
    Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v})`).join(', ');

  const countries: Record<string, number> = {};
  const regions: Record<string, number> = {};
  const producers: Record<string, number> = {};
  wines.forEach(w => {
    if (w.country) countries[w.country] = (countries[w.country] || 0) + w.quantity;
    if (w.region) regions[w.region] = (regions[w.region] || 0) + w.quantity;
    if (w.producer) producers[w.producer] = (producers[w.producer] || 0) + w.quantity;
  });

  // Price range
  const prices = wines.map(w => w.price).filter(p => p > 0);
  const priceRange = prices.length > 0
    ? `$${Math.min(...prices)}-$${Math.max(...prices)}`
    : 'N/A';

  // Vintage range
  const vintages = wines.map(w => w.vintage).filter(v => v > 0);
  const vintageRange = vintages.length > 0
    ? `${Math.min(...vintages)}-${Math.max(...vintages)}`
    : 'N/A';

  // Maturity breakdown
  const maturity: Record<string, number> = { 'Drink Now': 0, Hold: 0, 'Past Peak': 0, Unknown: 0 };
  wines.forEach(w => {
    const m = w.maturity || 'Unknown';
    maturity[m] = (maturity[m] || 0) + w.quantity;
  });
  const maturityStr = Object.entries(maturity).filter(([, n]) => n > 0).map(([k, v]) => `${k}: ${v}`).join(', ');

  // 3 most recent
  const recent = wines.slice(-3).reverse().map(w =>
    `${w.vintage || 'NV'} ${w.producer}${w.name ? ' ' + w.name : ''}`
  ).join('; ');

  return [
    `${totalBottles} bottles. Home currency: AUD.`,
    `Types: ${typeStr}.`,
    `Countries: ${top5(countries)}.`,
    `Regions: ${top5(regions)}.`,
    `Producers: ${top5(producers)}.`,
    `Prices (converted to AUD): ${priceRange}. Vintages: ${vintageRange}.`,
    `Maturity: ${maturityStr}.`,
    `Recent: ${recent}.`,
  ].join('\n');
}
