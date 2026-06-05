import { apiClient } from '@/lib/api-client';
import type {
  Scene,
  SceneListResponse,
  CreateScenePayload,
  UpdateScenePayload,
  AutoArrangePayload,
  AutoArrangeResponse,
  SuggestLayoutPayload,
  SuggestLayoutResponse,
  GenerateSeatCardsPayload,
  GenerateSeatCardsResponse,
} from './types';

export async function getScene(id: string): Promise<Scene> {
  return apiClient<Scene>(`/scenes/${id}`);
}

export async function getSceneByProject(projectId: string): Promise<Scene | null> {
  try {
    return await apiClient<Scene>(`/scenes/by-project/${projectId}`);
  } catch {
    return null;
  }
}

export async function listScenes(params?: {
  projectId?: string;
  page?: number;
  pageSize?: number;
}): Promise<SceneListResponse> {
  const search = new URLSearchParams();
  if (params?.projectId) search.set('projectId', params.projectId);
  search.set('page', String(params?.page ?? 1));
  search.set('pageSize', String(params?.pageSize ?? 20));
  return apiClient<SceneListResponse>(`/scenes?${search}`);
}

export async function createScene(payload: CreateScenePayload): Promise<Scene> {
  return apiClient<Scene>('/scenes', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateScene(id: string, payload: UpdateScenePayload): Promise<Scene> {
  return apiClient<Scene>(`/scenes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteScene(id: string): Promise<{ deleted: boolean }> {
  return apiClient<{ deleted: boolean }>(`/scenes/${id}`, {
    method: 'DELETE'
  });
}

// ── AI Scene Queries ──────────────────────────────────────────────────────

export async function autoArrangeSeats(
  sceneId: string,
  payload: AutoArrangePayload
): Promise<AutoArrangeResponse> {
  return apiClient<AutoArrangeResponse>(`/scenes/${sceneId}/auto-arrange`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function suggestLayout(
  sceneId: string,
  payload: SuggestLayoutPayload
): Promise<SuggestLayoutResponse> {
  return apiClient<SuggestLayoutResponse>(`/scenes/${sceneId}/suggest-layout`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function generateSeatCards(
  sceneId: string,
  payload: GenerateSeatCardsPayload
): Promise<GenerateSeatCardsResponse> {
  return apiClient<GenerateSeatCardsResponse>(`/scenes/${sceneId}/seat-cards`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
