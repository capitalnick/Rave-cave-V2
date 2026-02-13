export function sanitizeWineName<T extends Record<string, any>>(fields: T): T {
  const name = (fields.name || '').trim().toLowerCase();
  const producer = (fields.producer || '').trim().toLowerCase();
  const cepage = (fields.cepage || '').trim().toLowerCase();
  if (!name) return fields;
  if (producer && (name === producer || producer.includes(name) || name.includes(producer))) {
    return { ...fields, name: '' };
  }
  if (cepage && (name === cepage || cepage.includes(name) || name.includes(cepage))) {
    return { ...fields, name: '' };
  }
  return fields;
}
