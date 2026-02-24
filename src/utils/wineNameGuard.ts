export function sanitizeWineName<T extends Record<string, any>>(fields: T): T {
  const name = (fields.name || '').trim().toLowerCase();
  const producer = (fields.producer || '').trim().toLowerCase();
  if (!name) return fields;
  if (producer && (name === producer || producer.includes(name) || name.includes(producer))) {
    return { ...fields, name: '' };
  }
  // Check against grape varieties (array format)
  const varieties: { name: string }[] = fields.grapeVarieties || [];
  for (const g of varieties) {
    const grape = (g.name || '').trim().toLowerCase();
    if (grape && (name === grape || grape.includes(name) || name.includes(grape))) {
      return { ...fields, name: '' };
    }
  }
  return fields;
}
