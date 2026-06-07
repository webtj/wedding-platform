import { z } from "zod";
import { PERMISSIONS } from "./permissions.js";

export const LEAD_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  QUOTED: "quoted",
  NEGOTIATING: "negotiating",
  WON: "won",
  LOST: "lost",
} as const;

export const LEAD_SOURCE_CHANNEL = {
  WECHAT: "wechat",
  XIAOHONGSHU: "xiaohongshu",
  DOUYIN: "douyin",
  REFERRAL: "referral",
  OTHER: "other",
} as const;

export const PROJECT_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  COMPLETED: "completed",
} as const;

export const TASK_STATUS = {
  TO_DO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  CLOSED: "closed",
} as const;

export const ASSET_STATUS = {
  UPLOADING: "uploading",
  READY: "ready",
  ARCHIVED: "archived",
  DELETED: "deleted",
} as const;

export const NOTIFICATION_TYPE = {
  TASK: "task",
  ASSET: "asset",
  AI: "ai",
  SYSTEM: "system",
} as const;

export const AI_JOB_STATUS = {
  QUEUED: "queued",
  SUCCEUED: "succeeded",
  FAILED: "failed",
} as const;

export const AI_JOB_TYPE = {
  VOWS: "vows",
  SPEECH: "speech",
  SOCIAL_COPY: "social_copy",
  PLANNER_MARKETING: "planner_marketing",
} as const;

export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];
export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];
export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS];
export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];
export type AiJobStatus = (typeof AI_JOB_STATUS)[keyof typeof AI_JOB_STATUS];
export type AiJobType = (typeof AI_JOB_TYPE)[keyof typeof AI_JOB_TYPE];

export const nonEmptyTextSchema = z.string().trim().min(1).max(500);
export const optionalTextSchema = z.string().trim().max(2000).optional();
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createLeadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email("邮箱格式不正确").max(120).optional(),
  sourceChannel: z.nativeEnum(LEAD_SOURCE_CHANNEL).default(LEAD_SOURCE_CHANNEL.OTHER),
  consultationTime: z.string().optional(),
  weddingDate: dateOnlySchema.optional(),
  note: z.string().trim().max(2000).optional(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  status: z.nativeEnum(LEAD_STATUS).optional(),
  lostReason: z.string().trim().max(300).optional(),
  weddingDate: z.string().optional(),
});

export const createLeadFollowupSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  nextFollowUpAt: z.string().datetime().optional(),
});

export const convertLeadSchema = z.object({
  brideName: z.string().trim().min(1).max(80),
  groomName: z.string().trim().min(1).max(80),
  weddingDate: dateOnlySchema,
  ceremonyType: z.string().trim().max(60).optional(),
  venue: z.string().trim().max(160).optional(),
  guestCount: z.number().int().positive().max(2000).optional(),
  colorTheme: z.string().trim().max(80).optional(),
  style: z.string().trim().max(120).optional(),
  specialRequirements: z.string().trim().max(2000).optional(),
  plannerId: z.string().optional(),
});

export const createTaskSchema = z.object({
  stageId: z.string().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  assigneeType: z.string().default("planner"),
  assignedRoleId: z.string().optional(),
  dueDate: dateOnlySchema.optional(),
  priority: z.number().int().min(1).max(5).default(3),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateTaskSchema = z.object({
  stageId: z.string().nullable().optional(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.nativeEnum(TASK_STATUS).optional(),
  assignedRoleId: z.string().optional(),
  dueDate: dateOnlySchema.optional(),
  priority: z.number().int().min(1).max(5).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isBlocked: z.boolean().optional(),
  blockReason: z.string().trim().max(500).optional(),
});

export const createAssetUploadIntentSchema = z.object({
  filename: z.string().trim().min(1).max(240),
  contentType: z.string().trim().min(1).max(120),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(1024 * 1024 * 1024),
  category: z.string().trim().max(80).optional(),
});

export const createAiJobSchema = z.object({
  type: z.nativeEnum(AI_JOB_TYPE),
  prompt: z.string().trim().min(1).max(2000),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateLeadFollowupInput = z.infer<typeof createLeadFollowupSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateAssetUploadIntentInput = z.infer<typeof createAssetUploadIntentSchema>;
export type CreateAiJobInput = z.infer<typeof createAiJobSchema>;

// ── M5: Operations & Team ─────────────────────────────────────────────────

export const PROJECT_STAGE_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  DONE: "done",
  SKIPPED: "skipped",
} as const;

export const CONTRACT_STATUS = {
  PENDING_SIGN: "pending_sign",
  SIGNED: "signed",
  VOIDED: "voided",
} as const;

export type ProjectStageStatus = (typeof PROJECT_STAGE_STATUS)[keyof typeof PROJECT_STAGE_STATUS];
export type ContractStatus = (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS];

export const updateProjectSchema = z.object({
  brideName: z.string().trim().min(1).max(80).optional(),
  groomName: z.string().trim().min(1).max(80).optional(),
  weddingDate: dateOnlySchema.optional(),
  ceremonyType: z.string().trim().max(60).optional(),
  venue: z.string().trim().max(160).optional(),
  guestCount: z.number().int().positive().max(2000).optional(),
  guestCountFinal: z.number().int().positive().max(2000).optional(),
  colorTheme: z.string().trim().max(80).optional(),
  style: z.string().trim().max(120).optional(),
  specialRequirements: z.string().trim().max(2000).optional(),
  plannerId: z.string().optional(),
  status: z.nativeEnum(PROJECT_STATUS).optional(),
});

export const createProjectStageSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional(),
  dueDate: dateOnlySchema.optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateProjectStageSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.nativeEnum(PROJECT_STAGE_STATUS).optional(),
  dueDate: dateOnlySchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createContractSchema = z.object({
  contractNo: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().min(1).max(160),
  brideName: z.string().trim().min(1).max(80).optional(),
  groomName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  weddingDate: dateOnlySchema.optional(),
  venue: z.string().trim().max(160).optional(),
  serviceContent: z.string().trim().max(5000).optional(),
  companyName: z.string().trim().max(160).optional(),
  companyAddress: z.string().trim().max(300).optional(),
  note: z.string().trim().max(2000).optional(),
});

export const updateContractSchema = z.object({
  contractNo: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  status: z.nativeEnum(CONTRACT_STATUS).optional(),
  signedAt: z.string().datetime().optional(),
  brideName: z.string().trim().min(1).max(80).optional(),
  groomName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  weddingDate: z.string().optional(),
  venue: z.string().trim().max(160).optional(),
  serviceContent: z.string().trim().max(5000).optional(),
  companyName: z.string().trim().max(160).optional(),
  companyAddress: z.string().trim().max(300).optional(),
  note: z.string().trim().max(2000).optional(),
});

export const createTenantRoleSchema = z.object({
  tenantId: z.string().optional(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  permissionCodes: z.array(z.string()).default([]),
  menuItemIds: z.array(z.string()).optional(),
});

export const updateTenantRoleSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).optional(),
  permissionCodes: z.array(z.string()).optional(),
  menuItemIds: z.array(z.string()).optional(),
});

export const createTenantAdminSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
});

export const updateTenantAdminSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateProjectStageInput = z.infer<typeof createProjectStageSchema>;
export type UpdateProjectStageInput = z.infer<typeof updateProjectStageSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type CreateTenantRoleInput = z.infer<typeof createTenantRoleSchema>;
export type UpdateTenantRoleInput = z.infer<typeof updateTenantRoleSchema>;
export type CreateTenantAdminInput = z.infer<typeof createTenantAdminSchema>;
export type UpdateTenantAdminInput = z.infer<typeof updateTenantAdminSchema>;

// ── Menu & Role Permissions ──────────────────────────────────────────────

const permissionCodeSchema = z.enum(
  Object.values(PERMISSIONS) as [string, ...string[]]
);

export const createMenuItemSchema = z.object({
  parentId: z.string().optional(),
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().max(200).optional(),
  icon: z.string().trim().max(50).optional(),
  sortOrder: z.number().int().min(0).default(0),
  visible: z.boolean().default(true),
  permissionCodes: z.array(permissionCodeSchema).default([]),
});

export const updateMenuItemSchema = z.object({
  parentId: z.string().nullable().optional(),
  label: z.string().trim().min(1).max(80).optional(),
  href: z.string().trim().max(200).nullable().optional(),
  icon: z.string().trim().max(50).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
  permissionCodes: z.array(permissionCodeSchema).default([]),
});

export const assignRoleMenusSchema = z.object({
  menuIds: z.array(z.string()),
});

export const createAccountSchema = z.object({
  identifier: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(120).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)|(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])|(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9])|(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/,
    '密码需包含大写字母、小写字母、数字和特殊字符中至少 3 类'
  ),
  displayName: z.string().trim().min(1).max(80),
  roleIds: z.array(z.string()).min(1),
  tenantId: z.string().min(1),
});

export const updateAccountSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  password: z.string().min(4).max(120).optional(),
  roleIds: z.array(z.string()).optional(),
  tenantId: z.string().optional(),
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type AssignRoleMenusInput = z.infer<typeof assignRoleMenusSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

// ── M6: Timeline ─────────────────────────────────────────────────────────

export const TIMELINE_ITEM_STATUS = {
  PENDING: "pending",
  READY: "ready",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  CANCELED: "canceled",
} as const;

export const ATTENTION_ITEM_TYPE = {
  TASK: "task",
  NOTIFICATION: "notification",
  TIMELINE: "timeline",
} as const;

export type TimelineItemStatus = (typeof TIMELINE_ITEM_STATUS)[keyof typeof TIMELINE_ITEM_STATUS];
export type AttentionItemType = (typeof ATTENTION_ITEM_TYPE)[keyof typeof ATTENTION_ITEM_TYPE];

export const timelineTimeSchema = z.string().datetime();

export const createTimelineItemSchema = z.object({
  startTime: timelineTimeSchema,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  owner: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  status: z.nativeEnum(TIMELINE_ITEM_STATUS).default(TIMELINE_ITEM_STATUS.PENDING),
  sortOrder: z.number().int().min(0).default(0),
  reminderMinutesBefore: z.number().int().min(0).max(1440).optional(),
});

export const updateTimelineItemSchema = z.object({
  startTime: timelineTimeSchema.optional(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  owner: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  status: z.nativeEnum(TIMELINE_ITEM_STATUS).optional(),
  sortOrder: z.number().int().min(0).optional(),
  reminderMinutesBefore: z.number().int().min(0).max(1440).optional(),
});

export const reorderTimelineItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number().int().min(0),
    }),
  ),
});

export type CreateTimelineItemInput = z.infer<typeof createTimelineItemSchema>;
export type UpdateTimelineItemInput = z.infer<typeof updateTimelineItemSchema>;
export type ReorderTimelineItemsInput = z.infer<typeof reorderTimelineItemsSchema>;

// ── Calendar view ──────────────────────────────────────────────────────────
export const calendarQuerySchema = z.object({
  mode: z.enum(['project', 'task']),
  view: z.enum(['recent', 'natural']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;

export type CalendarDayItem = {
  date: string;
  isWeekend: boolean;
  projects: Array<{ id: string; no: string; name: string; venue: string | null }>;
  tasks: Array<{ id: string; title: string; time: string | null; projectId: string; projectName: string; priority: number }>;
};

export type CalendarData = {
  today: string;
  monthStart: string;
  monthEnd: string;
  view: 'recent' | 'natural';
  mode: 'project' | 'task';
  stats: { projects: number; activeProjects: number; pendingTasks: number; doneTasks: number };
  days: CalendarDayItem[];
};

// ── M7: Archive, Storage, AI Polish ─────────────────────────────────────────

export const ARCHIVE_PACKAGE_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
  EXPIRED: "expired",
} as const;

export const ARCHIVE_PACKAGE_TYPE = {
  FULL_PROJECT: "full_project",
  ASSETS_ONLY: "assets_only",
  CASE_DRAFT: "case_draft",
} as const;

export const RETENTION_REMINDER_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  DISMISSED: "dismissed",
} as const;

export const AI_TEMPLATE_CATEGORY = {
  COUPLE: "couple",
  PLANNER_MARKETING: "planner_marketing",
  TIMELINE: "timeline",
  CASE_STUDY: "case_study",
  IMAGE_DESIGN: "image_design",
} as const;

export type ArchivePackageStatus =
  (typeof ARCHIVE_PACKAGE_STATUS)[keyof typeof ARCHIVE_PACKAGE_STATUS];
export type ArchivePackageType = (typeof ARCHIVE_PACKAGE_TYPE)[keyof typeof ARCHIVE_PACKAGE_TYPE];
export type RetentionReminderStatus =
  (typeof RETENTION_REMINDER_STATUS)[keyof typeof RETENTION_REMINDER_STATUS];
export type AiTemplateCategory = (typeof AI_TEMPLATE_CATEGORY)[keyof typeof AI_TEMPLATE_CATEGORY];

export const completeProjectSchema = z.object({
  completedAt: z.string().datetime().optional(),
  note: z.string().trim().max(1000).optional(),
});

export const archiveProjectSchema = z.object({
  archivedAt: z.string().datetime().optional(),
  reason: z.string().trim().max(1000).optional(),
});

export const upsertRetentionPolicySchema = z.object({
  retentionDays: z.number().int().min(30).max(3650),
  archiveAfterDays: z.number().int().min(0).max(3650).default(0),
  notifyBeforeDays: z.number().int().min(1).max(365).default(30),
});

export const createArchivePackageSchema = z.object({
  type: z.nativeEnum(ARCHIVE_PACKAGE_TYPE),
  title: z.string().trim().min(1).max(160),
  includeAssets: z.boolean().default(true),
  includeContracts: z.boolean().default(false),
  includeAiOutputs: z.boolean().default(true),
  expiresInDays: z.number().int().min(1).max(365).default(30),
});

export const createAiOutputVersionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(10000),
  note: z.string().trim().max(1000).optional(),
});

export const refineAiOutputSchema = z.object({
  instruction: z.string().trim().min(1).max(2000),
  saveAsVersion: z.boolean().default(true),
});

export type CompleteProjectInput = z.infer<typeof completeProjectSchema>;
export type ArchiveProjectInput = z.infer<typeof archiveProjectSchema>;
export type UpsertRetentionPolicyInput = z.infer<typeof upsertRetentionPolicySchema>;
export type CreateArchivePackageInput = z.infer<typeof createArchivePackageSchema>;
export type CreateAiOutputVersionInput = z.infer<typeof createAiOutputVersionSchema>;
export type RefineAiOutputInput = z.infer<typeof refineAiOutputSchema>;

// ── Process Templates ──────────────────────────────────────────────────────

export const createProcessTemplateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(60).optional(),
});

export const updateProcessTemplateSchema = createProcessTemplateSchema.partial();

export const createTemplateStageSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateTemplateStageSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createTemplateTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  assigneeType: z.string().default("planner"),
  assignedRoleId: z.string().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  offsetDays: z.number().int().min(-365).max(730).default(0),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateTemplateTaskSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  assigneeType: z.string().optional(),
  assignedRoleId: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  offsetDays: z.number().int().min(-365).max(730).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createChecklistItemSchema = z.object({
  content: z.string().trim().min(1).max(500),
  sortOrder: z.number().int().min(0).default(0),
});

export const applyTemplateSchema = z.object({
  templateId: z.string(),
});

export type CreateProcessTemplateInput = z.infer<typeof createProcessTemplateSchema>;
export type UpdateProcessTemplateInput = z.infer<typeof updateProcessTemplateSchema>;
export type CreateTemplateStageInput = z.infer<typeof createTemplateStageSchema>;
export type UpdateTemplateStageInput = z.infer<typeof updateTemplateStageSchema>;
export type CreateTemplateTaskInput = z.infer<typeof createTemplateTaskSchema>;
export type UpdateTemplateTaskInput = z.infer<typeof updateTemplateTaskSchema>;
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>;

// ── Materials ──────────────────────────────────────────────────────────────

export const MATERIAL_STATUS = {
  AVAILABLE: "available",
  MISSING: "missing",
} as const;
export type MaterialStatus = (typeof MATERIAL_STATUS)[keyof typeof MATERIAL_STATUS];

export const createMaterialCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().min(0).default(0),
});
export const updateMaterialCategorySchema = createMaterialCategorySchema.partial();

export const createMaterialSchema = z.object({
  categoryId: z.string(),
  name: z.string().trim().min(1).max(120),
  status: z.nativeEnum(MATERIAL_STATUS).default(MATERIAL_STATUS.MISSING),
  quantity: z.number().int().min(0).optional(),
  note: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().min(0).default(0),
});
export const updateMaterialSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  status: z.nativeEnum(MATERIAL_STATUS).optional(),
  quantity: z.number().int().min(0).optional(),
  note: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export const linkTaskMaterialSchema = z.object({ materialId: z.string() });
export const confirmTaskMaterialSchema = z.object({ confirmed: z.boolean() });

export type CreateMaterialCategoryInput = z.infer<typeof createMaterialCategorySchema>;
export type UpdateMaterialCategoryInput = z.infer<typeof updateMaterialCategorySchema>;
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type LinkTaskMaterialInput = z.infer<typeof linkTaskMaterialSchema>;
export type ConfirmTaskMaterialInput = z.infer<typeof confirmTaskMaterialSchema>;

// ── AI Workbench: Material Types ───────────────────────────────────────────

export const AI_GENERATION_TYPE = {
  TEXT2IMG: "text2img",
  IMG2IMG: "img2img",
  EDIT: "edit",
  UPSCALE: "upscale",
} as const;

export const AI_GENERATION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type AiGenerationType = (typeof AI_GENERATION_TYPE)[keyof typeof AI_GENERATION_TYPE];
export type AiGenerationStatus = (typeof AI_GENERATION_STATUS)[keyof typeof AI_GENERATION_STATUS];

const sizeOptionSchema = z.object({
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
});

export const createMaterialTypeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  code: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/),
  icon: z.string().trim().max(200).optional(),
  defaultSize: z
    .object({
      width: z.number().int().positive().max(10000),
      height: z.number().int().positive().max(10000),
    })
    .optional(),
  sizes: z.array(sizeOptionSchema).max(20).optional(),
});

export const updateMaterialTypeSchema = createMaterialTypeSchema.partial();

export const aiGenerateSchema = z.object({
  materialTypeId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  conversationId: z.string().trim().min(1).max(80).optional(),
  type: z.nativeEnum(AI_GENERATION_TYPE).default(AI_GENERATION_TYPE.TEXT2IMG),
  prompt: z.string().trim().min(1).max(2000),
  style: z.string().trim().min(1).max(100),
  size: z.object({
    width: z.number().int().positive().max(10000),
    height: z.number().int().positive().max(10000),
  }),
  count: z.number().int().min(1).max(6).default(4),
  sourceImageUrl: z.string().url().optional(),
  referenceAssetIds: z.array(z.string()).optional(),
  referenceMode: z.enum(['style', 'subject', 'pet']).optional(),
});

export const aiRefineSchema = z.object({
  generationId: z.string().min(1),
  feedback: z.string().trim().min(1).max(2000),
  count: z.number().int().min(1).max(6).optional(),
});

export const aiGenerationQuerySchema = z.object({
  projectId: z.string().optional(),
  materialTypeId: z.string().optional(),
  conversationId: z.string().optional(),
  status: z.nativeEnum(AI_GENERATION_STATUS).optional(),
  isBookmarked: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const aiGenerationBookmarkSchema = z.object({
  isBookmarked: z.boolean(),
  businessTags: z.array(z.string().trim().min(1).max(40)).max(20).optional()
});

export const aiSeriesGenerateSchema = z.object({
  generationId: z.string().min(1),
  targetMaterialTypeId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  instruction: z.string().trim().min(1).max(1000),
  count: z.number().int().min(1).max(6).default(4)
});

export type CreateMaterialTypeInput = z.infer<typeof createMaterialTypeSchema>;
export type UpdateMaterialTypeInput = z.infer<typeof updateMaterialTypeSchema>;
export type AiGenerationBookmarkInput = z.infer<typeof aiGenerationBookmarkSchema>;
export type AiSeriesGenerateInput = z.infer<typeof aiSeriesGenerateSchema>;
export type AiGenerateInput = z.infer<typeof aiGenerateSchema>;
export type AiRefineInput = z.infer<typeof aiRefineSchema>;
export type AiGenerationQueryInput = z.infer<typeof aiGenerationQuerySchema>;

export const aiGenerationFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reason: z.string().trim().max(1000).optional(),
  imageId: z.string().optional(),
});

export type AiGenerationFeedbackInput = z.infer<typeof aiGenerationFeedbackSchema>;

// ── Scene / Layout Editor ───────────────────────────────────────────────────

export const createSceneSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1).max(100).default("默认场景"),
  width: z.number().positive().max(200),
  height: z.number().positive().max(200),
  unit: z.enum(["meter", "cm"]).default("meter"),
});

export const updateSceneSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  width: z.number().positive().max(200).optional(),
  height: z.number().positive().max(200).optional(),
  sceneData: z.record(z.unknown()).optional(),
  thumbnail: z.string().optional(),
});

export const sceneQuerySchema = z.object({
  projectId: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type CreateSceneInput = z.infer<typeof createSceneSchema>;
export type UpdateSceneInput = z.infer<typeof updateSceneSchema>;
export type SceneQueryInput = z.infer<typeof sceneQuerySchema>;
