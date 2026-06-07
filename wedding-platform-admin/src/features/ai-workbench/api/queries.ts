import { apiClient } from '@/lib/api-client';
import { getAccessToken } from '@/lib/auth/auth-storage';
import type {
  AiConversation,
  AiConversationMessage,
  AiGeneration,
  AiGenerationFeedback,
  AiGenerationImage,
  AiGenerationResponse,
  AiReferenceAsset,
  AiTemplate,
  AiTextGeneration,
  AiTextGenerationResponse,
  BookmarkGenerationPayload,
  CreateAiTemplatePayload,
  FeedbackPayload,
  GeneratePayload,
  GenerationEvent,
  GenerationJob,
  RefinePayload,
  SeriesGeneratePayload,
  MaterialTypeResponse,
  QuotaStats,
  TextGeneratePayload,
  TextRefinePayload,
  UpdateAiTemplatePayload
} from './types';

export async function getMaterialTypes(): Promise<MaterialTypeResponse> {
  return apiClient<MaterialTypeResponse>('/material-types?pageSize=100');
}

export async function getQuota(): Promise<QuotaStats> {
  return apiClient<QuotaStats>('/ai/quota');
}

export async function generate(payload: GeneratePayload): Promise<AiGeneration> {
  return apiClient<AiGeneration>('/ai/generate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function refine(payload: RefinePayload): Promise<AiGeneration> {
  return apiClient<AiGeneration>('/ai/refine', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function generateSeries(
  payload: SeriesGeneratePayload
): Promise<AiGeneration> {
  return apiClient<AiGeneration>('/ai/series', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getGeneration(id: string): Promise<AiGeneration> {
  return apiClient<AiGeneration>(`/ai/generations/${id}`);
}

export async function listGenerations(params?: {
  materialTypeId?: string;
  conversationId?: string;
  projectId?: string;
  status?: string;
  isBookmarked?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<AiGenerationResponse> {
  const search = new URLSearchParams();
  if (params?.materialTypeId) search.set('materialTypeId', params.materialTypeId);
  if (params?.conversationId) search.set('conversationId', params.conversationId);
  if (params?.projectId) search.set('projectId', params.projectId);
  if (params?.status) search.set('status', params.status);
  if (typeof params?.isBookmarked === 'boolean') {
    search.set('isBookmarked', String(params.isBookmarked));
  }
  search.set('page', String(params?.page ?? 1));
  search.set('pageSize', String(params?.pageSize ?? 12));
  return apiClient<AiGenerationResponse>(`/ai/generations?${search}`);
}

export async function updateGenerationBookmark(
  id: string,
  payload: BookmarkGenerationPayload
): Promise<AiGeneration> {
  return apiClient<AiGeneration>(`/ai/generations/${id}/bookmark`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function getAiTemplates(category?: string): Promise<AiTemplate[]> {
  const search = new URLSearchParams();
  if (category) search.set('category', category);
  return apiClient<AiTemplate[]>(`/ai/templates${search.size ? `?${search}` : ''}`);
}

export async function createAiTemplate(payload: CreateAiTemplatePayload): Promise<AiTemplate> {
  return apiClient<AiTemplate>('/ai/templates', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAiTemplate(
  id: string,
  payload: UpdateAiTemplatePayload
): Promise<AiTemplate> {
  return apiClient<AiTemplate>(`/ai/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteAiTemplate(id: string): Promise<{ deleted: boolean }> {
  return apiClient<{ deleted: boolean }>(`/ai/templates/${id}`, {
    method: 'DELETE'
  });
}

export async function deleteGeneration(id: string): Promise<{ deleted: boolean }> {
  return apiClient<{ deleted: boolean }>(`/ai/generations/${id}`, {
    method: 'DELETE'
  });
}

export async function submitFeedback(
  generationId: string,
  payload: FeedbackPayload
): Promise<AiGenerationFeedback> {
  return apiClient<AiGenerationFeedback>(`/ai/generations/${generationId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function selectImage(imageId: string): Promise<AiGenerationImage> {
  return apiClient<AiGenerationImage>(`/ai/generation-images/${imageId}/select`, {
    method: 'PATCH'
  });
}

export async function bookmarkImage(
  imageId: string,
  isBookmarked: boolean
): Promise<AiGenerationImage> {
  return apiClient<AiGenerationImage>(`/ai/generation-images/${imageId}/bookmark`, {
    method: 'PATCH',
    body: JSON.stringify({ isBookmarked })
  });
}

export async function downloadGenerationImage(imageId: string): Promise<Blob> {
  const token = getAccessToken();
  const response = await fetch(`/api/ai/generation-images/${imageId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }
  return response.blob();
}

export async function downloadImage(id: string, index: number, filename: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`/api/ai/generations/${id}/download?index=${index}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error(`下载失败 (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function listConversations(params?: { projectId?: string }): Promise<AiConversation[]> {
  const search = new URLSearchParams();
  if (params?.projectId) search.set('projectId', params.projectId);
  const qs = search.toString();
  return apiClient<AiConversation[]>(`/ai/conversations${qs ? `?${qs}` : ''}`);
}

export async function getConversation(id: string): Promise<AiConversation> {
  return apiClient<AiConversation>(`/ai/conversations/${id}`);
}

export async function createConversation(data: { projectId?: string; title?: string }): Promise<AiConversation> {
  return apiClient<AiConversation>('/ai/conversations', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function addConversationMessage(
  conversationId: string,
  data: { role: string; content?: string; generationId?: string; metadata?: Record<string, unknown> }
): Promise<AiConversationMessage> {
  return apiClient<AiConversationMessage>(`/ai/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function uploadReferenceAsset(data: FormData): Promise<AiReferenceAsset> {
  return apiClient<AiReferenceAsset>('/ai/reference-assets', {
    method: 'POST',
    body: data,
    // @ts-expect-error -- sentinel to suppress default application/json Content-Type; browser sets multipart boundary
    headers: { 'Content-Type': null }
  });
}

export async function listReferenceAssets(params?: {
  projectId?: string;
  conversationId?: string;
}): Promise<AiReferenceAsset[]> {
  const search = new URLSearchParams();
  if (params?.projectId) search.set('projectId', params.projectId);
  if (params?.conversationId) search.set('conversationId', params.conversationId);
  return apiClient<AiReferenceAsset[]>(`/ai/reference-assets?${search.toString()}`);
}

export async function deleteReferenceAsset(id: string): Promise<void> {
  return apiClient(`/ai/reference-assets/${id}`, { method: 'DELETE' });
}

export async function getGenerationJob(jobId: string): Promise<GenerationJob> {
  return apiClient<GenerationJob>(`/ai/generation-jobs/${jobId}`);
}

export function subscribeToGenerationEvents(
  conversationId: string,
  onEvent: (event: GenerationEvent) => void,
  onError?: (error: Event) => void,
): EventSource {
  const token = getAccessToken();
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  const qs = params.toString();
  const url = `/api/ai/conversations/${conversationId}/events${qs ? `?${qs}` : ''}`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener('message', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as GenerationEvent;
      onEvent(data);
    } catch (e) {
      console.error('Failed to parse event:', e);
    }
  });

  eventSource.addEventListener('error', (error) => {
    console.error('SSE error:', error);
    onError?.(error as Event);
    eventSource.close();
  });

  return eventSource;
}

// ── Text Generation ───────────────────────────────────────────────────

export async function generateText(payload: TextGeneratePayload): Promise<AiTextGeneration> {
  return apiClient<AiTextGeneration>('/ai/text/generate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function refineText(
  id: string,
  payload: TextRefinePayload
): Promise<AiTextGeneration> {
  return apiClient<AiTextGeneration>(`/ai/text/generations/${id}/refine`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listTextGenerations(params?: {
  type?: string;
  projectId?: string;
  isBookmarked?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<AiTextGenerationResponse> {
  const search = new URLSearchParams();
  if (params?.type) search.set('type', params.type);
  if (params?.projectId) search.set('projectId', params.projectId);
  if (typeof params?.isBookmarked === 'boolean') {
    search.set('isBookmarked', String(params.isBookmarked));
  }
  search.set('page', String(params?.page ?? 1));
  search.set('pageSize', String(params?.pageSize ?? 20));
  return apiClient<AiTextGenerationResponse>(`/ai/text/generations?${search}`);
}

export async function getTextGeneration(id: string): Promise<AiTextGeneration> {
  return apiClient<AiTextGeneration>(`/ai/text/generations/${id}`);
}

export async function updateTextBookmark(
  id: string,
  isBookmarked: boolean
): Promise<AiTextGeneration> {
  return apiClient<AiTextGeneration>(`/ai/text/generations/${id}/bookmark`, {
    method: 'PATCH',
    body: JSON.stringify({ isBookmarked })
  });
}

export async function deleteTextGeneration(id: string): Promise<{ deleted: boolean }> {
  return apiClient<{ deleted: boolean }>(`/ai/text/generations/${id}`, {
    method: 'DELETE'
  });
}
