import { create } from 'zustand';
import type { SceneObject, SceneJson, VenueConfig, CameraConfig, StyleConfig, SceneLayer } from '../api/types';

const DEFAULT_VENUE: VenueConfig = {
  type: 'banquet_hall',
  name: '宴会厅',
  width: 20,
  depth: 30,
  height: 6,
  entrances: [{ id: 'entrance_01', x: 10, y: 30, direction: 'south' }],
  mainDirection: 'north'
};

const DEFAULT_LAYERS: SceneLayer[] = [
  { id: 'stage', name: '舞台', visible: true, locked: false },
  { id: 'tables', name: '桌椅', visible: true, locked: false },
  { id: 'ceremony', name: '仪式', visible: true, locked: false },
  { id: 'entrance', name: '入口', visible: true, locked: false },
  { id: 'decoration', name: '装饰', visible: true, locked: false }
];

interface HistoryEntry {
  objects: SceneObject[];
}

interface SceneState {
  sceneId: string | null;
  projectId: string | null;
  name: string;
  venue: VenueConfig;
  camera: CameraConfig;
  style: StyleConfig;
  objects: SceneObject[];
  layers: SceneLayer[];
  dirty: boolean;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  nextId: number;

  initScene: (scene: SceneJson, sceneId: string) => void;
  setVenue: (venue: Partial<VenueConfig>) => void;
  addObject: (obj: Omit<SceneObject, 'id'>) => string;
  updateObject: (id: string, patch: Partial<SceneObject>) => void;
  removeObject: (id: string) => void;
  moveObject: (id: string, x: number, y: number) => void;
  rotateObject: (id: string, rotation: number) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  toSceneJson: () => SceneJson;
  setDirty: (dirty: boolean) => void;
}

function genId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeObject(raw: unknown): SceneObject | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!obj.id || typeof obj.id !== 'string') return null;

  return {
    id: obj.id,
    type: typeof obj.type === 'string' ? obj.type : 'unknown',
    category: typeof obj.category === 'string' ? obj.category : 'decoration',
    name: typeof obj.name === 'string' ? obj.name : String(obj.type ?? 'unknown'),
    position: {
      x: typeof (obj.position as Record<string, unknown>)?.x === 'number' ? (obj.position as Record<string, number>).x : 0,
      y: typeof (obj.position as Record<string, unknown>)?.y === 'number' ? (obj.position as Record<string, number>).y : 0
    },
    size: {
      width: typeof (obj.size as Record<string, unknown>)?.width === 'number' ? (obj.size as Record<string, number>).width : 1,
      depth: typeof (obj.size as Record<string, unknown>)?.depth === 'number' ? (obj.size as Record<string, number>).depth : 1,
      height: typeof (obj.size as Record<string, unknown>)?.height === 'number' ? (obj.size as Record<string, number>).height : 0
    },
    rotation: typeof obj.rotation === 'number' ? obj.rotation : 0,
    layerId: typeof obj.layerId === 'string' ? obj.layerId : 'decoration',
    locked: obj.locked === true,
    visible: obj.visible !== false,
    style: obj.style && typeof obj.style === 'object' ? obj.style as Record<string, unknown> : {},
    business: obj.business && typeof obj.business === 'object' ? obj.business as Record<string, unknown> : {}
  };
}

export const useSceneStore = create<SceneState>((set, get) => ({
  sceneId: null,
  projectId: null,
  name: '默认场景',
  venue: { ...DEFAULT_VENUE },
  camera: { zoom: 1, panX: 0, panY: 0 },
  style: { theme: 'default', colorPalette: ['#F3E3C3', '#C9A45C', '#FFFFFF'] },
  objects: [],
  layers: DEFAULT_LAYERS.map((l) => ({ ...l })),
  dirty: false,
  undoStack: [],
  redoStack: [],
  nextId: 1,

  initScene: (scene, sceneId) => {
    const rawObjects = Array.isArray(scene?.objects) ? scene.objects : [];
    const sanitized = rawObjects.map(sanitizeObject).filter((o): o is SceneObject => o !== null);

    set({
      sceneId,
      projectId: scene?.projectId ?? null,
      name: scene?.name ?? '默认场景',
      venue: scene?.venue ?? DEFAULT_VENUE,
      camera: scene?.camera ?? { zoom: 1, panX: 0, panY: 0 },
      style: scene?.style ?? { theme: 'default', colorPalette: ['#F3E3C3', '#C9A45C', '#FFFFFF'] },
      objects: sanitized,
      layers: scene?.layers?.length ? scene.layers : DEFAULT_LAYERS.map((l) => ({ ...l })),
      dirty: false,
      undoStack: [],
      redoStack: []
    });
  },

  setVenue: (patch) =>
    set((state) => ({
      venue: { ...state.venue, ...patch },
      dirty: true
    })),

  addObject: (obj) => {
    const id = genId();
    set((state) => {
      const full: SceneObject = { ...obj, id };
      return {
        objects: [...state.objects, full],
        dirty: true,
        undoStack: [...state.undoStack, { objects: state.objects }],
        redoStack: []
      };
    });
    return id;
  },

  updateObject: (id, patch) =>
    set((state) => ({
      objects: state.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      dirty: true
    })),

  removeObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((o) => o.id !== id),
      dirty: true,
      undoStack: [...state.undoStack, { objects: state.objects }],
      redoStack: []
    })),

  moveObject: (id, x, y) =>
    set((state) => ({
      objects: state.objects.map((o) =>
        o.id === id ? { ...o, position: { ...o.position, x, y } } : o
      ),
      dirty: true
    })),

  rotateObject: (id, rotation) =>
    set((state) => ({
      objects: state.objects.map((o) => (o.id === id ? { ...o, rotation } : o)),
      dirty: true
    })),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        objects: prev.objects,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, { objects: state.objects }],
        dirty: true
      };
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      return {
        objects: next.objects,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, { objects: state.objects }],
        dirty: true
      };
    }),

  pushHistory: () =>
    set((state) => ({
      undoStack: [...state.undoStack, { objects: state.objects }],
      redoStack: []
    })),

  toSceneJson: () => {
    const state = get();
    return {
      projectId: state.projectId ?? '',
      sceneId: state.sceneId ?? '',
      name: state.name,
      version: '1.0.0',
      unit: 'meter',
      venue: state.venue,
      camera: state.camera,
      style: state.style,
      objects: state.objects,
      layers: state.layers
    };
  },

  setDirty: (dirty) => set({ dirty })
}));
