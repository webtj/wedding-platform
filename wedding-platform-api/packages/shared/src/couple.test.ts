import { describe, expect, it } from 'vitest';
import { createTimelineItemSchema, reorderTimelineItemsSchema, updateTimelineItemSchema } from './business';

describe('M6 couple and timeline schemas', () => {
  it('accepts a timeline item visible to couple by default', () => {
    const result = createTimelineItemSchema.parse({
      startTime: '2026-06-18T08:30:00.000Z',
      title: '新娘化妆',
      sortOrder: 1
    });
    expect(result.visibleToCouple).toBe(true);
    expect(result.status).toBe('pending');
  });

  it('rejects invalid reminder window', () => {
    expect(() =>
      createTimelineItemSchema.parse({
        startTime: '2026-06-18T08:30:00.000Z',
        title: '迎宾',
        reminderMinutesBefore: 2000
      })
    ).toThrow();
  });

  it('accepts timeline reorder payload', () => {
    expect(
      reorderTimelineItemsSchema.parse({
        items: [
          { id: 'timeline_1', sortOrder: 0 },
          { id: 'timeline_2', sortOrder: 1 }
        ]
      })
    ).toHaveProperty('items');
  });

  it('accepts partial timeline updates', () => {
    expect(updateTimelineItemSchema.parse({ status: 'done' })).toEqual({ status: 'done' });
  });
});
