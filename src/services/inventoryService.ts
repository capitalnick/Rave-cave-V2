
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "../firebase";
import { Wine, FIRESTORE_FIELD_MAP } from '../types';
// Fixed: Import CONFIG from constants instead of types
import { CONFIG } from '../constants';

const WINES_COLLECTION = 'wines';

function docToWine(docId: string, data: Record<string, any>): Wine {
  const wine: any = { id: docId };
  Object.keys(FIRESTORE_FIELD_MAP).forEach(key => {
    const firestoreKey = FIRESTORE_FIELD_MAP[key];
    wine[key] = data[firestoreKey];
  });
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
    const winesRef = collection(db, WINES_COLLECTION);
    const snapshot = await getDocs(winesRef);
    return snapshot.docs.map(d => docToWine(d.id, d.data())).filter(w => !!w.producer);
  },

  onInventoryChange: (callback: (wines: Wine[]) => void): Unsubscribe => {
    return onSnapshot(collection(db, WINES_COLLECTION), (snap) => {
      callback(snap.docs.map(d => docToWine(d.id, d.data())).filter(w => !!w.producer));
    });
  },

  addWine: async (wine: Omit<Wine, 'id'>): Promise<string | null> => {
    try {
      const docRef = await addDoc(collection(db, WINES_COLLECTION), wineToDoc(wine));
      return docRef.id;
    } catch (e) {
      console.error("Firestore Add Failed", e);
      return null;
    }
  },

  deleteWine: async (docId: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, WINES_COLLECTION, docId));
      return true;
    } catch (e) {
      console.error("Firestore Delete Failed", e);
      return false;
    }
  },

  updateField: async (docId: string, field: string, value: any): Promise<boolean> => {
    const firestoreKey = FIRESTORE_FIELD_MAP[field] || field;
    try {
      await updateDoc(doc(db, WINES_COLLECTION, docId), { [firestoreKey]: value });
      return true;
    } catch (e) {
      console.error("Firestore Update Failed", e);
      return false;
    }
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
