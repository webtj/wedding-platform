import { queryOptions } from '@tanstack/react-query';
import { getCalendar } from './service';
import type { CalendarData, CalendarQuery } from './types';

export const calendarKeys = {
  all: ['timeline-calendar'] as const,
  view: (q: CalendarQuery) => [...calendarKeys.all, q] as const,
};

export function calendarQueryOptions(query: CalendarQuery) {
  return queryOptions<CalendarData>({
    queryKey: calendarKeys.view(query),
    queryFn: () => getCalendar(query),
  });
}
