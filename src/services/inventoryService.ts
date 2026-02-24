
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "../firebase";
import { Wine, FIRESTORE_FIELD_MAP } from '../types';
import { migrateLegacyFields } from '../utils/grapeUtils';
// Fixed: Import CONFIG from constants instead of types
import { CONFIG } from '../constants';
import { requireUid } from '@/utils/authHelpers';

function userWinesCollection() {
  return collection(db, 'users', requireUid(), 'wines');
}

function userWineDoc(docId: string) {
  return doc(db, 'users', requireUid(), 'wines', docId);
}

function docToWine(docId: string, data: Record<string, any>): Wine {
  const wine: any = { id: docId };
  Object.keys(FIRESTORE_FIELD_MAP).forEach(key => {
    const firestoreKey = FIRESTORE_FIELD_MAP[key];
    wine[key] = data[firestoreKey];
  });
  // Fallback: legacy docs may have 'Cépage' / 'Blend %' instead of 'Grape Varieties'
  if (!wine.grapeVarieties || !Array.isArray(wine.grapeVarieties) || wine.grapeVarieties.length === 0) {
    wine.grapeVarieties = migrateLegacyFields(data['Cépage'], data['Blend %']);
  }
  return wine as Wine;
}

function wineToDoc(wine: Partial<Wine>): Record<string, any> {
  const doc: Record<string, any> = {};
  Object.keys(FIRESTORE_FIELD_MAP).forEach(key => {
    const firestoreKey = FIRESTORE_FIELD_MAP[key];
    if ((wine as any)[key] !== undefined) doc[firestoreKey] = (wine as any)[key];
  });
  return doc;
}

export const inventoryService = {
  getInventory: async (): Promise<Wine[]> => {
    const winesRef = userWinesCollection();
    const snapshot = await getDocs(winesRef);
    return snapshot.docs.map(d => docToWine(d.id, d.data())).filter(w => !!w.producer);
  },

  onInventoryChange: (callback: (wines: Wine[]) => void): Unsubscribe => {
    return onSnapshot(userWinesCollection(), (snap) => {
      callback(snap.docs.map(d => docToWine(d.id, d.data())).filter(w => !!w.producer));
    });
  },

  addWine: async (wine: Omit<Wine, 'id'>): Promise<string | null> => {
    try {
      const docRef = await addDoc(userWinesCollection(), wineToDoc(wine));
      return docRef.id;
    } catch (e) {
      console.error("Firestore Add Failed", e);
      return null;
    }
  },

  deleteWine: async (docId: string): Promise<boolean> => {
    try {
      await deleteDoc(userWineDoc(docId));
      return true;
    } catch (e) {
      console.error("Firestore Delete Failed", e);
      return false;
    }
  },

  updateField: async (docId: string, field: string, value: any): Promise<boolean> => {
    const firestoreKey = FIRESTORE_FIELD_MAP[field] || field;
    try {
      await updateDoc(userWineDoc(docId), { [firestoreKey]: value });
      return true;
    } catch (e) {
      console.error("Firestore Update Failed", e);
      return false;
    }
  },

  updateFields: async (docId: string, fields: Record<string, any>): Promise<boolean> => {
    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
      mapped[FIRESTORE_FIELD_MAP[key] || key] = value;
    }
    try {
      await updateDoc(userWineDoc(docId), mapped);
      return true;
    } catch (e) {
      console.error("Firestore Batch Update Failed", e);
      return false;
    }
  },

  buildCellarSummary: (inventory: Wine[]): string => {
    if (inventory.length === 0) return "Cellar is empty.";

    const totalBottles = inventory.reduce((sum, w) => sum + (Number(w.quantity) || 0), 0);

    // Type breakdown
    const types: Record<string, number> = {};
    inventory.forEach(w => { types[w.type] = (types[w.type] || 0) + (Number(w.quantity) || 0); });
    const typeStr = Object.entries(types).map(([t, n]) => `${t}: ${n}`).join(', ');

    // Top 5 helpers
    const top5 = (acc: Record<string, number>) =>
      Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v})`).join(', ');

    const countries: Record<string, number> = {};
    const regions: Record<string, number> = {};
    const producers: Record<string, number> = {};
    inventory.forEach(w => {
      const qty = Number(w.quantity) || 0;
      if (w.country) countries[w.country] = (countries[w.country] || 0) + qty;
      if (w.region) regions[w.region] = (regions[w.region] || 0) + qty;
      if (w.producer) producers[w.producer] = (producers[w.producer] || 0) + qty;
    });

    // Price range
    const prices = inventory.map(w => Number(w.price) || 0).filter(p => p > 0);
    const priceRange = prices.length > 0 ? `$${Math.min(...prices)}-$${Math.max(...prices)}` : 'N/A';

    // Vintage range
    const vintages = inventory.map(w => Number(w.vintage) || 0).filter(v => v > 0);
    const vintageRange = vintages.length > 0 ? `${Math.min(...vintages)}-${Math.max(...vintages)}` : 'N/A';

    // Maturity breakdown
    const maturity: Record<string, number> = { 'Drink Now': 0, Hold: 0, 'Past Peak': 0, Unknown: 0 };
    inventory.forEach(w => {
      const m = w.maturity || 'Unknown';
      maturity[m] = (maturity[m] || 0) + (Number(w.quantity) || 0);
    });
    const maturityStr = Object.entries(maturity).filter(([, n]) => n > 0).map(([k, v]) => `${k}: ${v}`).join(', ');

    // 3 most recent (by array order, newest last)
    const recent = inventory.slice(-3).reverse().map(w => `${w.vintage} ${w.producer}${w.name ? ' ' + w.name : ''}`).join('; ');

    return [
      `${totalBottles} bottles.`,
      `Types: ${typeStr}.`,
      `Countries: ${top5(countries)}.`,
      `Regions: ${top5(regions)}.`,
      `Producers: ${top5(producers)}.`,
      `Prices: ${priceRange}. Vintages: ${vintageRange}.`,
      `Maturity: ${maturityStr}.`,
      `Recent: ${recent}.`,
    ].join(' ');
  },

  getCellarSnapshot: (inventory: Wine[]): string => {
    if (inventory.length === 0) return "Cellar is empty.";
    // Limit to prevent token bloat
    const limited = inventory.slice(0, CONFIG.INVENTORY_LIMIT);
    let context = `INVENTORY (Showing top ${limited.length} bottles):\n`;
    limited.forEach(w => {
      context += `- ${w.vintage} ${w.producer} ${w.name} (${w.type}, $${w.price}, Qty: ${w.quantity}, Maturity: ${w.maturity})\n`;
    });
    return context;
  },

  getStats: (inventory: Wine[]) => {
    const totalBottles = inventory.reduce((sum, w) => sum + (Number(w.quantity) || 0), 0);
    const totalValue = inventory.reduce((sum, w) => sum + ((Number(w.price) || 0) * (Number(w.quantity) || 0)), 0);
    const typeDistribution: Record<string, number> = {};
    inventory.forEach(w => typeDistribution[w.type] = (typeDistribution[w.type] || 0) + (Number(w.quantity) || 0));
    const producers: Record<string, number> = {};
    inventory.forEach(w => producers[w.producer] = (producers[w.producer] || 0) + (Number(w.quantity) || 0));
    const topProducers = Object.entries(producers).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0,5);
    return { totalBottles, totalValue, typeDistribution, topProducers };
  },

  localQuery: (inventory: Wine[], filters: any): Wine[] => {
    return inventory.filter(w => {
      if (filters.type && w.type !== filters.type) return false;
      if (filters.producer && !w.producer.toLowerCase().includes(filters.producer.toLowerCase())) return false;
      return true;
    }).slice(0, 5);
  }
};
