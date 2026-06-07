export function generateContractNo(provided?: string): string {
  if (provided && provided.trim().length > 0) {
    return provided;
  }
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomPart = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * 36)]).join('');
  return `HT-${randomPart}-${datePart}`;
}
