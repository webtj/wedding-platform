/**
 * Unified date formatting utilities.
 *
 * Backend always returns ISO 8601 strings (e.g., "2026-06-18T00:00:00.000Z").
 * These functions convert to the formats needed by the frontend.
 *
 * - toDateInput(iso)  → "2026-06-18"   (for <input type="date">)
 * - toDateDisplay(iso) → "2026/6/18"   (for table display, zh-CN)
 */

export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function toDateDisplay(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('zh-CN');
}

export function toDateTimeDisplay(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export function isWithinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return false;
  const now = Date.now();
  const horizon = now + days * 24 * 60 * 60 * 1000;
  return target >= now && target <= horizon;
}
