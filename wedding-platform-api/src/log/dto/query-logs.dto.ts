import { z } from 'zod';

// ── Shared primitives ──────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const baseFiltersSchema = z.object({
  userId: z.string().optional(),
  tenantId: z.string().optional(),
});

// ── Request logs ───────────────────────────────────────────────────────────

export const queryRequestLogsSchema = paginationSchema
  .merge(dateRangeSchema)
  .merge(baseFiltersSchema)
  .extend({
    path: z.string().optional(),
    statusCode: z.coerce.number().int().optional(),
    method: z.string().optional(),
  });

export type QueryRequestLogsDto = z.infer<typeof queryRequestLogsSchema>;

// ── Error logs ─────────────────────────────────────────────────────────────

export const queryErrorLogsSchema = paginationSchema
  .merge(dateRangeSchema)
  .merge(baseFiltersSchema)
  .extend({
    path: z.string().optional(),
  });

export type QueryErrorLogsDto = z.infer<typeof queryErrorLogsSchema>;

// ── Audit logs ─────────────────────────────────────────────────────────────

export const queryAuditLogsSchema = paginationSchema
  .merge(dateRangeSchema)
  .merge(baseFiltersSchema)
  .extend({
    action: z.string().optional(),
    entity: z.string().optional(),
  });

export type QueryAuditLogsDto = z.infer<typeof queryAuditLogsSchema>;

// ── Behavior events ────────────────────────────────────────────────────────

export const queryEventLogsSchema = paginationSchema
  .merge(dateRangeSchema)
  .merge(baseFiltersSchema)
  .extend({
    eventType: z.string().optional(),
    eventName: z.string().optional(),
  });

export type QueryEventLogsDto = z.infer<typeof queryEventLogsSchema>;

// ── Stats ──────────────────────────────────────────────────────────────────

export const statsDateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type StatsDateRangeDto = z.infer<typeof statsDateRangeSchema>;
