import { apiClient } from '@/lib/api-client';
import type { CalendarData, CalendarQuery } from './types';

export function getCalendar(query: CalendarQuery): Promise<CalendarData> {
  const params = new URLSearchParams(query);
  return apiClient(`/studio/timeline/calendar?${params.toString()}`);
}
