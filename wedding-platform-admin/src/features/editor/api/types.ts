// ── Scene JSON Types (PRD 6.x) ─────────────────────────────────────────────

export interface VenueConfig {
  type: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  entrances: Array<{ id: string; x: number; y: number; direction: string }>;
  mainDirection: string;
}

export interface CameraConfig {
  zoom: number;
  panX: number;
  panY: number;
}

export interface StyleConfig {
  theme: string;
  colorPalette: string[];
}

export interface SceneLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface SceneObject {
  id: string;
  type: string;
  category: string;
  name: string;
  position: { x: number; y: number };
  size: { width: number; depth: number; height: number };
  rotation: number;
  layerId: string;
  locked: boolean;
  visible: boolean;
  style: Record<string, unknown>;
  business: Record<string, unknown>;
}

export interface SceneJson {
  projectId: string;
  sceneId: string;
  name: string;
  version: string;
  unit: 'meter' | 'cm';
  venue: VenueConfig;
  camera: CameraConfig;
  style: StyleConfig;
  objects: SceneObject[];
  layers: SceneLayer[];
}

// ── API Types ──────────────────────────────────────────────────────────────

export interface Scene {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  width: number;
  height: number;
  unit: string;
  sceneData: SceneJson;
  thumbnail: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    projectNo: string;
    brideName: string;
    groomName: string;
  };
}

export interface SceneListResponse {
  items: Scene[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateScenePayload {
  projectId: string;
  name?: string;
  width: number;
  height: number;
  unit?: 'meter' | 'cm';
}

export interface UpdateScenePayload {
  name?: string;
  width?: number;
  height?: number;
  sceneData?: SceneJson;
  thumbnail?: string;
}

// ── Material Definition ────────────────────────────────────────────────────

export interface MaterialDef {
  type: string;
  category: string;
  name: string;
  icon: string;
  defaultSize: { width: number; depth: number; height: number };
  color: string;
  business?: Record<string, unknown>;
}

export type MaterialCategory = 'stage' | 'table' | 'ceremony' | 'entrance' | 'decoration' | 'functional';

// ── AI Scene Types ─────────────────────────────────────────────────────────

export interface GuestInfo {
  name: string;
  group?: string;
  tablePreference?: string;
}

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
  score: number;
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

// ── AI Scene Payloads ──────────────────────────────────────────────────────

export interface AutoArrangePayload {
  guestList: GuestInfo[];
  tableCount?: number;
  seatsPerTable?: number;
  constraints?: {
    keepGroupsTogether?: boolean;
    vipTables?: number;
    avoidPairs?: Array<[string, string]>;
  };
}

export interface SuggestLayoutPayload {
  guestCount: number;
  venueWidth: number;
  venueDepth: number;
  style?: 'round_tables' | 'rectangular_tables' | 'mixed' | 'banquet_hall' | 'outdoor';
  stagePosition?: 'north' | 'south' | 'east' | 'west';
  specialRequirements?: string;
}

export interface GenerateSeatCardsPayload {
  tableAssignments: Array<{
    tableNumber: number;
    tableName?: string;
    guests: Array<{
      name: string;
      title?: string;
    }>;
  }>;
  style?: 'elegant' | 'modern' | 'rustic' | 'minimalist' | 'floral';
  language?: 'zh' | 'en' | 'both';
  includeQRCode?: boolean;
}

// ── AI Scene Responses ─────────────────────────────────────────────────────

export interface AutoArrangeResponse {
  tables: TableAssignment[];
  reasoning: string;
  tableCount: number;
  seatsPerTable: number;
}

export interface SuggestLayoutResponse {
  suggestions: LayoutSuggestion[];
  venueWidth: number;
  venueDepth: number;
}

export interface GenerateSeatCardsResponse {
  cards: SeatCardData[];
  totalRequested: number;
  generated: number;
  failed: number;
  errors?: Array<{
    tableNumber: number;
    guestName: string;
    error: string;
  }>;
}
