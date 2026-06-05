import { Point, Rectangle, Graphics } from 'pixi.js';
import type { FederatedPointerEvent, FederatedWheelEvent } from 'pixi.js';
import { PixiEditorApp } from './pixi-app';
import type { SceneObject } from '../api/types';
import { createObjectGraphic, setSelected, updateObjectPosition } from './object-factory';
import { P0_MATERIALS } from '../constants/materials';
import { useCanvasStore } from '../store/canvas-store';
import { useSceneStore } from '../store/scene-store';

type ObjectMap = Map<string, import('pixi.js').Container>;

export class InteractionManager {
  private pixiApp: PixiEditorApp;
  private objectMap: ObjectMap = new Map();
  private dragTarget: import('pixi.js').Container | null = null;
  private dragOffset = { x: 0, y: 0 };
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private selectionGraphics: Graphics | null = null;

  constructor(pixiApp: PixiEditorApp) {
    this.pixiApp = pixiApp;
    this.setupCanvasInteraction();
  }

  private setupCanvasInteraction(): void {
    const stage = this.pixiApp.app.stage;
    stage.eventMode = 'static';
    // Set hit area to cover the full canvas
    const screen = this.pixiApp.app.screen;
    stage.hitArea = new Rectangle(0, 0, screen.width, screen.height);

    stage.on('pointerdown', this.onPointerDown.bind(this));
    stage.on('pointermove', this.onPointerMove.bind(this));
    stage.on('pointerup', this.onPointerUp.bind(this));
    stage.on('pointerupoutside', this.onPointerUp.bind(this));
    stage.on('wheel', this.onWheel.bind(this));
  }

  private onPointerDown(e: FederatedPointerEvent): void {
    const canvasStore = useCanvasStore.getState();
    const sceneStore = useSceneStore.getState();

    // Middle button or pan tool - start panning
    const nativeEvent = e.originalEvent as unknown as MouseEvent | undefined;
    if (nativeEvent?.button === 1 || canvasStore.tool === 'pan') {
      this.isPanning = true;
      this.panStart = { x: e.global.x, y: e.global.y };
      return;
    }

    // Only handle left click for selection/drag
    if (nativeEvent?.button !== 0) return;

    const worldPos = this.getWorldPosition(e);

    // Check if clicking on an object
    for (const [id, container] of this.objectMap) {
      const obj = sceneStore.objects.find((o) => o.id === id);
      if (!obj || obj.locked || !obj.visible) continue;

      // Use rotated bounds for accurate hit testing
      const px = container.position.x;
      const py = container.position.y;
      const w = container.width;
      const h = container.height;
      const rotation = container.rotation;

      // Transform click point to object's local coordinate system
      const dx = worldPos.x - px;
      const dy = worldPos.y - py;
      const cos = Math.cos(-rotation);
      const sin = Math.sin(-rotation);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      if (localX >= 0 && localX <= w && localY >= 0 && localY <= h) {
        this.dragTarget = container;
        this.dragOffset = { x: worldPos.x - px, y: worldPos.y - py };

        if (nativeEvent?.shiftKey) {
          canvasStore.addToSelection(id);
        } else {
          canvasStore.select(id);
        }
        this.updateSelectionVisuals();
        return;
      }
    }

    // Clicked empty space - start selection rectangle
    if (!nativeEvent?.shiftKey) {
      canvasStore.clearSelection();
    }
    canvasStore.startSelection(worldPos.x, worldPos.y);
    this.createSelectionGraphics();
    this.updateSelectionVisuals();
  }

  private onPointerMove(e: FederatedPointerEvent): void {
    // Handle panning
    if (this.isPanning) {
      const dx = e.global.x - this.panStart.x;
      const dy = e.global.y - this.panStart.y;
      const world = this.pixiApp.world;
      world.position.x += dx;
      world.position.y += dy;
      this.panStart = { x: e.global.x, y: e.global.y };

      // Update store
      const canvasStore = useCanvasStore.getState();
      canvasStore.setPan(world.position.x, world.position.y);
      return;
    }

    // Handle selection rectangle
    const canvasStore = useCanvasStore.getState();
    if (canvasStore.isSelecting) {
      const worldPos = this.getWorldPosition(e);
      canvasStore.updateSelection(worldPos.x, worldPos.y);
      this.updateSelectionGraphics();
      return;
    }

    if (!this.dragTarget) return;

    const sceneStore = useSceneStore.getState();
    const worldPos = this.getWorldPosition(e);
    const id = this.dragTarget.label;

    const obj = sceneStore.objects.find((o) => o.id === id);
    if (!obj || obj.locked) return;

    let newX = worldPos.x - this.dragOffset.x;
    let newY = worldPos.y - this.dragOffset.y;

    // Snap to grid
    if (canvasStore.snapToGrid) {
      const snapPx = 50; // 1 meter
      newX = Math.round(newX / snapPx) * snapPx;
      newY = Math.round(newY / snapPx) * snapPx;
    }

    // Clamp to venue bounds
    const venuePxW = PixiEditorApp.metersToPx(sceneStore.venue.width);
    const venuePxH = PixiEditorApp.metersToPx(sceneStore.venue.depth);
    newX = Math.max(0, Math.min(newX, venuePxW - this.dragTarget.width));
    newY = Math.max(0, Math.min(newY, venuePxH - this.dragTarget.height));

    this.dragTarget.position.set(newX, newY);
  }

  private onPointerUp(): void {
    this.isPanning = false;

    // Handle selection end
    const canvasStore = useCanvasStore.getState();
    if (canvasStore.isSelecting) {
      this.selectObjectsInRect();
      canvasStore.endSelection();
      this.removeSelectionGraphics();
      return;
    }

    if (!this.dragTarget) return;

    const sceneStore = useSceneStore.getState();
    const id = this.dragTarget.label;
    const newX = PixiEditorApp.pxToMeters(this.dragTarget.position.x);
    const newY = PixiEditorApp.pxToMeters(this.dragTarget.position.y);

    sceneStore.pushHistory();
    sceneStore.moveObject(id, newX, newY);
    this.dragTarget = null;
  }

  private onWheel(e: FederatedWheelEvent): void {
    const canvasStore = useCanvasStore.getState();
    const world = this.pixiApp.world;

    // Get mouse position in world coordinates before zoom
    const mousePos = e.global;
    const worldPosBefore = world.toLocal(mousePos);

    // Calculate new zoom
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.max(0.1, Math.min(5, canvasStore.zoom + delta));

    // Apply zoom
    world.scale.set(newZoom);
    canvasStore.setZoom(newZoom);

    // Get mouse position in world coordinates after zoom
    const worldPosAfter = world.toLocal(mousePos);

    // Adjust pan to keep mouse position stable
    world.position.x += (worldPosAfter.x - worldPosBefore.x) * newZoom;
    world.position.y += (worldPosAfter.y - worldPosBefore.y) * newZoom;

    // Update store
    canvasStore.setPan(world.position.x, world.position.y);
  }

  private getWorldPosition(e: FederatedPointerEvent): { x: number; y: number } {
    const world = this.pixiApp.world;
    const local = world.toLocal(e.global);
    return { x: local.x, y: local.y };
  }

  private createSelectionGraphics(): void {
    this.removeSelectionGraphics();
    this.selectionGraphics = new Graphics();
    this.selectionGraphics.label = 'selection-rect';
    this.pixiApp.objectsLayer.addChild(this.selectionGraphics);
  }

  private updateSelectionGraphics(): void {
    if (!this.selectionGraphics) return;
    const canvasStore = useCanvasStore.getState();
    const rect = canvasStore.selectionRect;
    if (!rect) return;

    this.selectionGraphics.clear();
    this.selectionGraphics.rect(rect.x, rect.y, rect.width, rect.height);
    this.selectionGraphics.fill({ color: '#4a90d9', alpha: 0.1 });
    this.selectionGraphics.stroke({ width: 1, color: '#4a90d9', alpha: 0.5 });
  }

  private removeSelectionGraphics(): void {
    if (this.selectionGraphics) {
      this.selectionGraphics.destroy();
      this.selectionGraphics = null;
    }
  }

  private selectObjectsInRect(): void {
    const canvasStore = useCanvasStore.getState();
    const sceneStore = useSceneStore.getState();
    const rect = canvasStore.selectionRect;
    if (!rect || rect.width < 5 || rect.height < 5) return;

    const selectedIds: string[] = [];

    for (const [id, container] of this.objectMap) {
      const obj = sceneStore.objects.find((o) => o.id === id);
      if (!obj || obj.locked || !obj.visible) continue;

      const px = container.position.x;
      const py = container.position.y;
      const w = container.width;
      const h = container.height;

      // Check if object overlaps with selection rectangle
      if (px < rect.x + rect.width &&
          px + w > rect.x &&
          py < rect.y + rect.height &&
          py + h > rect.y) {
        selectedIds.push(id);
      }
    }

    if (selectedIds.length > 0) {
      canvasStore.selectMultiple(selectedIds);
      this.updateSelectionVisuals();
    }
  }

  private updateSelectionVisuals(): void {
    const selectedIds = useCanvasStore.getState().selectedIds;
    for (const [id, container] of this.objectMap) {
      setSelected(container, selectedIds.has(id));
    }
  }

  syncObjects(objects: SceneObject[]): void {
    const layer = this.pixiApp.objectsLayer;

    // Remove stale
    for (const [id, container] of this.objectMap) {
      if (!objects.find((o) => o.id === id)) {
        layer.removeChild(container);
        container.destroy();
        this.objectMap.delete(id);
      }
    }

    // Add/update
    for (const obj of objects) {
      if (!obj || !obj.id) continue;
      try {
        const existing = this.objectMap.get(obj.id);
        if (existing) {
          updateObjectPosition(existing, obj);
        } else {
          const material = P0_MATERIALS.find((m) => m.type === obj.type);
          const container = createObjectGraphic(obj, material);
          layer.addChild(container);
          this.objectMap.set(obj.id, container);
        }
      } catch (err) {
        console.error('Failed to sync object:', obj.id, err);
      }
    }

    this.updateSelectionVisuals();
  }

  deleteSelected(): void {
    const sceneStore = useSceneStore.getState();
    const selectedIds = useCanvasStore.getState().selectedIds;
    for (const id of selectedIds) {
      sceneStore.removeObject(id);
    }
    useCanvasStore.getState().clearSelection();
  }

  /**
   * Handle drop from material panel
   */
  handleDrop(clientX: number, clientY: number, materialData: string): void {
    try {
      const material = JSON.parse(materialData);
      const worldPos = this.getWorldPositionFromClient(clientX, clientY);
      const sceneStore = useSceneStore.getState();
      const canvasStore = useCanvasStore.getState();

      // Snap to grid if enabled
      let x = PixiEditorApp.pxToMeters(worldPos.x);
      let y = PixiEditorApp.pxToMeters(worldPos.y);

      if (canvasStore.snapToGrid) {
        x = Math.round(x);
        y = Math.round(y);
      }

      // Clamp to venue bounds
      x = Math.max(0, Math.min(x, sceneStore.venue.width - material.defaultSize.width));
      y = Math.max(0, Math.min(y, sceneStore.venue.depth - material.defaultSize.depth));

      sceneStore.pushHistory();
      sceneStore.addObject({
        type: material.type,
        category: material.category,
        name: material.name,
        position: { x, y },
        size: material.defaultSize,
        rotation: 0,
        layerId: material.category === 'table' ? 'tables' : material.category,
        locked: false,
        visible: true,
        style: { color: material.color },
        business: material.business ?? {}
      });
    } catch (err) {
      console.error('Failed to handle drop:', err);
    }
  }

  private getWorldPositionFromClient(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = this.pixiApp.canvas;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return this.pixiApp.world.toLocal(new Point(x, y));
  }

  destroy(): void {
    this.pixiApp.app.stage.off('pointerdown');
    this.pixiApp.app.stage.off('pointermove');
    this.pixiApp.app.stage.off('pointerup');
    this.pixiApp.app.stage.off('pointerupoutside');
    this.pixiApp.app.stage.off('wheel');
  }
}
