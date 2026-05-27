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
