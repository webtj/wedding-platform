import {
  createTimelineItemSchema,
  reorderTimelineItemsSchema,
  updateTimelineItemSchema,
  type CreateTimelineItemInput,
  type ReorderTimelineItemsInput,
  type UpdateTimelineItemInput
} from '@wedding/shared';

export { createTimelineItemSchema, updateTimelineItemSchema, reorderTimelineItemsSchema };
export type CreateTimelineItemDto = CreateTimelineItemInput;
export type UpdateTimelineItemDto = UpdateTimelineItemInput;
export type ReorderTimelineItemsDto = ReorderTimelineItemsInput;
