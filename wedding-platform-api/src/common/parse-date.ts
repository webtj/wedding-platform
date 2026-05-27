export function parseDateOnly(value?: string) {
  if (!value) return undefined;
  return value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00.000Z`);
}
