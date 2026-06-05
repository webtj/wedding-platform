import { create } from 'zustand';

export type Tool = 'select' | 'pan' | 'rotate';

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasState {
  tool: Tool;
  zoom: number;
  panX: number;
  panY: number;
  selectedIds: Set<string>;
  snapToGrid: boolean;
  showGrid: boolean;
  isSelecting: boolean;
  selectionRect: SelectionRect | null;

  setTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  select: (id: string) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;
  removeSelection: (id: string) => void;
  toggleSnap: () => void;
  toggleGrid: () => void;
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: () => void;
  selectMultiple: (ids: string[]) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  tool: 'select',
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedIds: new Set(),
  snapToGrid: true,
  showGrid: true,
  isSelecting: false,
  selectionRect: null,

  setTool: (tool) => set({ tool }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
  select: (id) => set({ selectedIds: new Set([id]) }),
  addToSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      next.add(id);
      return { selectedIds: next };
    }),
  clearSelection: () => set({ selectedIds: new Set() }),
  removeSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      next.delete(id);
      return { selectedIds: next };
    }),
  toggleSnap: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  startSelection: (x, y) => set({ isSelecting: true, selectionRect: { x, y, width: 0, height: 0 } }),
  updateSelection: (x, y) =>
    set((state) => {
      if (!state.selectionRect) return state;
      const startX = state.selectionRect.x;
      const startY = state.selectionRect.y;
      return {
        selectionRect: {
          x: Math.min(startX, x),
          y: Math.min(startY, y),
          width: Math.abs(x - startX),
          height: Math.abs(y - startY)
        }
      };
    }),
  endSelection: () => set({ isSelecting: false, selectionRect: null }),
  selectMultiple: (ids) => set({ selectedIds: new Set(ids) })
}));
