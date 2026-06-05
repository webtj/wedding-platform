import { createSceneSchema, updateSceneSchema, sceneQuerySchema } from '@wedding/shared';
import { z } from 'zod';

export { createSceneSchema, updateSceneSchema, sceneQuerySchema };
export type CreateSceneDto = typeof createSceneSchema._type;
export type UpdateSceneDto = typeof updateSceneSchema._type;
export type SceneQueryDto = typeof sceneQuerySchema._type;

// ── AI Scene DTOs ──────────────────────────────────────────────────────────

export const autoArrangeSchema = z.object({
  guestList: z.array(
    z.object({
      name: z.string().trim().min(1).max(80),
      group: z.string().trim().max(80).optional(), // e.g., "family", "friends", "colleagues"
      tablePreference: z.string().trim().max(80).optional(), // e.g., "VIP", "near stage"
    })
  ).min(1).max(500),
  tableCount: z.number().int().min(1).max(50).optional(),
  seatsPerTable: z.number().int().min(2).max(20).optional(),
  constraints: z.object({
    keepGroupsTogether: z.boolean().default(true),
    vipTables: z.number().int().min(0).max(10).default(0),
    avoidPairs: z.array(z.tuple([z.string(), z.string()])).optional(), // pairs of guests to separate
  }).optional(),
});

export const suggestLayoutSchema = z.object({
  guestCount: z.number().int().min(1).max(500),
  venueWidth: z.number().positive().max(200),
  venueDepth: z.number().positive().max(200),
  style: z.enum(['round_tables', 'rectangular_tables', 'mixed', 'banquet_hall', 'outdoor']).default('round_tables'),
  stagePosition: z.enum(['north', 'south', 'east', 'west']).default('north'),
  specialRequirements: z.string().trim().max(1000).optional(),
});

export const generateSeatCardsSchema = z.object({
  tableAssignments: z.array(
    z.object({
      tableNumber: z.number().int().min(1),
      tableName: z.string().trim().max(50).optional(),
      guests: z.array(
        z.object({
          name: z.string().trim().min(1).max(80),
          title: z.string().trim().max(50).optional(), // e.g., "Bride's mother"
        })
      ).min(1).max(20),
    })
  ).min(1).max(50),
  style: z.enum(['elegant', 'modern', 'rustic', 'minimalist', 'floral']).default('elegant'),
  language: z.enum(['zh', 'en', 'both']).default('zh'),
  includeQRCode: z.boolean().default(false),
});

export type AutoArrangeDto = typeof autoArrangeSchema._type;
export type SuggestLayoutDto = typeof suggestLayoutSchema._type;
export type GenerateSeatCardsDto = typeof generateSeatCardsSchema._type;

// ── Response Types ─────────────────────────────────────────────────────────

export interface TableAssignment {
  tableNumber: number;
  tableName: string;
  guests: Array<{
    name: string;
    group?: string;
    seatPosition: number;
  }>;
  position: { x: number; y: number };
}

export interface LayoutSuggestion {
  id: string;
  name: string;
  description: string;
  tables: Array<{
    tableNumber: number;
    type: 'round' | 'rectangular';
    capacity: number;
    position: { x: number; y: number };
    size: { width: number; depth: number };
  }>;
  aisles: Array<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    width: number;
  }>;
  score: number; // AI confidence score 0-1
  reasoning: string;
}

export interface SeatCardData {
  tableNumber: number;
  tableName: string;
  guestName: string;
  guestTitle?: string;
  imageUrl: string;
  templateStyle: string;
}
