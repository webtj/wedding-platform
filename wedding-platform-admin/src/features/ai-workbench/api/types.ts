export type AiGenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AiGenerationType = 'text2img' | 'img2img';

export interface AiGenerationMetadata {
  requested?: number;
  produced?: number;
  action?: 'generate' | 'refine' | 'series';
  sourceGenerationId?: string;
  sourceMaterialTypeId?: string;
  [key: string]: unknown;
}

export interface MaterialType {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  defaultSize: { width: number; height: number } | null;
  sizes: { width: number; height: number }[] | null;
  isSystem: boolean;
}

export interface MaterialTypeResponse {
  items: MaterialType[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AiGenerationImage {
  id: string;
  generationId: string;
  tenantId: string;
  url: string;
  index: number;
  width: number | null;
  height: number | null;
  provider: string | null;
  model: string | null;
  seed: string | null;
  metadata: Record<string, unknown> | null;
  isSelected: boolean;
  isBookmarked: boolean;
  createdAt: string;
}

export interface AiGeneration {
  id: string;
  tenantId: string;
  userId: string;
  projectId: string | null;
  conversationId: string | null;
  parentGenerationId: string | null;
  materialTypeId: string;
  type: AiGenerationType;
  prompt: string;
  aiPrompt: string;
  style: string;
  size: { width: number; height: number };
  sourceImageUrl: string | null;
  resultImageUrl: string | null;
  resultImageUrls: string[] | null;
  resultPsdUrl: string | null;
  status: AiGenerationStatus;
  errorMessage: string | null;
  metadata: AiGenerationMetadata | null;
  isBookmarked: boolean;
  bookmarkedAt: string | null;
  businessTags: string[] | null;
  createdAt: string;
  updatedAt: string;
  materialType?: { name: string; code: string };
  images?: AiGenerationImage[];
}

export interface AiGenerationResponse {
  items: AiGeneration[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type PromptCategoryType = 'image_design' | 'copywriting' | 'general';

export interface QuickPromptCategory {
  id: string;
  tenantId: string | null;
  name: string;
  type: PromptCategoryType;
  sortOrder: number;
  prompts: QuickPrompt[];
}

export interface QuickPrompt {
  id: string;
  tenantId: string | null;
  categoryId: string;
  name: string;
  prompt: string;
  sortOrder: number;
}

export interface GeneratePayload {
  materialTypeId: string;
  projectId?: string;
  conversationId?: string;
  type?: AiGenerationType;
  prompt: string;
  style: string;
  size: { width: number; height: number };
  count: number;
  sourceImageUrl?: string;
  referenceAssetIds?: string[];
  referenceMode?: 'style' | 'subject' | 'pet';
}

export interface RefinePayload {
  generationId: string;
  feedback: string;
  count?: number;
}

export interface BookmarkGenerationPayload {
  isBookmarked: boolean;
  businessTags?: string[];
}

export interface SeriesGeneratePayload {
  generationId: string;
  targetMaterialTypeId: string;
  instruction: string;
  count?: number;
}

export interface FeedbackPayload {
  rating: number;
  reason?: string;
  imageId?: string;
}

export interface AiGenerationFeedback {
  id: string;
  tenantId: string;
  userId: string;
  generationId: string;
  imageId: string | null;
  rating: number;
  reason: string | null;
  createdAt: string;
}

export interface QuotaStats {
  hourlyUsed: number;
  hourlyLimit: number;
  hourlyRemaining: number;
  weeklyUsed: number;
  weeklyLimit: number;
  weeklyRemaining: number;
}

export interface AiConversation {
  id: string;
  tenantId: string;
  userId: string;
  projectId: string | null;
  title: string;
  currentGenerationId: string | null;
  currentDesignState: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  messages?: AiConversationMessage[];
}

export interface AiReferenceAsset {
  id: string;
  tenantId: string;
  userId: string;
  projectId: string | null;
  conversationId: string | null;
  role: string; // style | subject | pet
  url: string;
  thumbnailUrl: string | null;
  filename: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AiConversationMessage {
  id: string;
  conversationId: string;
  tenantId: string;
  role: string;
  content: string | null;
  attachments: Array<Record<string, unknown>> | null;
  generationId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface GenerationJob {
  id: string;
  generationId: string;
  tenantId: string;
  status: string;
  progress: number;
  provider: string | null;
  model: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface GenerationEvent {
  type: 'started' | 'progress' | 'completed' | 'failed';
  generationId: string;
  progress?: number;
  message?: string;
  timestamp: string;
}

// ── Quick Prompt Types ─────────────────────────────────────────────────

export type PromptCategoryType = 'image_design' | 'copywriting' | 'general';

export interface QuickPromptCategory {
  id: string;
  tenantId: string | null;
  name: string;
  type: PromptCategoryType;
  sortOrder: number;
  prompts: QuickPrompt[];
}

export interface QuickPrompt {
  id: string;
  tenantId: string | null;
  categoryId: string;
  name: string;
  prompt: string;
  sortOrder: number;
}

// ── Text Generation Types ─────────────────────────────────────────────

export type TextGenerationType = 'vows' | 'speech' | 'social_copy' | 'invitation' | 'story';

export interface AiTextGeneration {
  id: string;
  tenantId: string;
  userId: string;
  projectId: string | null;
  type: TextGenerationType;
  prompt: string;
  result: string;
  style: string | null;
  language: string;
  metadata: Record<string, unknown> | null;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiTextGenerationResponse {
  items: AiTextGeneration[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TextGeneratePayload {
  type: TextGenerationType;
  prompt: string;
  style?: string;
  language?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export interface TextRefinePayload {
  feedback: string;
  style?: string;
}

export interface TextGenerationTypeConfig {
  id: TextGenerationType;
  label: string;
  description: string;
  placeholder: string;
}
