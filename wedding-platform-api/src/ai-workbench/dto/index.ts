import { z } from 'zod';
import {
  aiGenerateSchema,
  aiRefineSchema,
  aiGenerationQuerySchema,
  aiGenerationBookmarkSchema,
  aiSeriesGenerateSchema,
  aiGenerationFeedbackSchema
} from '@wedding/shared';

export {
  aiGenerateSchema,
  aiRefineSchema,
  aiGenerationQuerySchema,
  aiGenerationBookmarkSchema,
  aiSeriesGenerateSchema,
  aiGenerationFeedbackSchema
};

export type AiGenerateDto = typeof aiGenerateSchema._type;
export type AiRefineDto = typeof aiRefineSchema._type;
export type AiGenerationQueryDto = typeof aiGenerationQuerySchema._type;
export type AiGenerationBookmarkDto = typeof aiGenerationBookmarkSchema._type;
export type AiSeriesGenerateDto = typeof aiSeriesGenerateSchema._type;
export type AiGenerationFeedbackDto = typeof aiGenerationFeedbackSchema._type;

// ── Compose Text DTO ────────────────────────────────────────────────────

export const aiComposeTextSchema = z.object({
  title: z.string().max(200).optional(),
  items: z.array(z.string().max(200)).max(20).optional(),
  names: z.string().max(100).optional(),
  date: z.string().max(50).optional(),
  templateId: z.string().optional(),
  imageIndex: z.number().int().min(0).default(0),
});

export type AiComposeTextDto = typeof aiComposeTextSchema._type;
