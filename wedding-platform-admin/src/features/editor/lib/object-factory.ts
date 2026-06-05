import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { MaterialDef, SceneObject } from '../api/types';
import { PixiEditorApp } from './pixi-app';

const COLORS: Record<string, string> = {
  stage: '#8b7355',
  table: '#f3e3c3',
  ceremony: '#90ee90',
  entrance: '#87ceeb',
  decoration: '#ffb6c1',
  functional: '#dda0dd'
};

const HIGHLIGHT_COLOR = '#4a90d9';
const SELECTION_STROKE = 2;

export function createObjectGraphic(obj: SceneObject, material?: MaterialDef): Container {
  const container = new Container();
  container.label = obj.id;

  const w = PixiEditorApp.metersToPx(obj.size?.width ?? 1);
  const d = PixiEditorApp.metersToPx(obj.size?.depth ?? 1);
  const color = material?.color ?? (obj.style?.color as string) ?? COLORS[obj.category] ?? '#cccccc';
  const type = obj.type ?? '';

  // Create shape based on object type
  const fillG = new Graphics();
  const strokeG = new Graphics();

  if (type === 'round_table' || type === 'main_table') {
    // Round table - draw circle
    const radius = Math.min(w, d) / 2;
    fillG.circle(radius, radius, radius);
    fillG.fill({ color, alpha: 0.85 });
    strokeG.circle(radius, radius, radius);
    strokeG.stroke({ width: 1, color: '#999999', alpha: 0.6 });
  } else if (type === 'chair') {
    // Chair - draw small circle with back
    const radius = Math.min(w, d) / 2;
    fillG.circle(radius, radius, radius * 0.8);
    fillG.fill({ color, alpha: 0.85 });
    // Draw chair back
    fillG.rect(radius * 0.3, 0, radius * 1.4, radius * 0.3);
    fillG.fill({ color: darkenColor(color, 20), alpha: 0.9 });
    strokeG.circle(radius, radius, radius * 0.8);
    strokeG.stroke({ width: 1, color: '#999999', alpha: 0.6 });
  } else if (type === 'arch') {
    // Arch - draw arc shape
    fillG.arc(w / 2, d, Math.min(w, d) / 2, Math.PI, 0);
    fillG.lineTo(w, d);
    fillG.lineTo(0, d);
    fillG.closePath();
    fillG.fill({ color, alpha: 0.85 });
    strokeG.arc(w / 2, d, Math.min(w, d) / 2, Math.PI, 0);
    strokeG.lineTo(w, d);
    strokeG.lineTo(0, d);
    strokeG.closePath();
    strokeG.stroke({ width: 1, color: '#999999', alpha: 0.6 });
  } else if (type === 'main_stage' || type === 'catwalk') {
    // Stage - draw with 3D effect
    fillG.roundRect(0, 0, w, d, 4);
    fillG.fill({ color, alpha: 0.85 });
    // Add 3D effect - top face
    const depth = PixiEditorApp.metersToPx(obj.size?.height ?? 0.2);
    fillG.moveTo(0, 0);
    fillG.lineTo(depth, -depth);
    fillG.lineTo(w + depth, -depth);
    fillG.lineTo(w, 0);
    fillG.closePath();
    fillG.fill({ color: lightenColor(color, 20), alpha: 0.7 });
    // Add 3D effect - right face
    fillG.moveTo(w, 0);
    fillG.lineTo(w + depth, -depth);
    fillG.lineTo(w + depth, d - depth);
    fillG.lineTo(w, d);
    fillG.closePath();
    fillG.fill({ color: darkenColor(color, 20), alpha: 0.7 });
    strokeG.roundRect(0, 0, w, d, 4);
    strokeG.stroke({ width: 1, color: '#999999', alpha: 0.6 });
  } else {
    // Default - rounded rectangle
    fillG.roundRect(0, 0, w, d, 4);
    fillG.fill({ color, alpha: 0.85 });
    strokeG.roundRect(0, 0, w, d, 4);
    strokeG.stroke({ width: 1, color: '#999999', alpha: 0.6 });
  }

  fillG.label = 'fill';
  container.addChild(fillG);
  strokeG.label = 'stroke';
  container.addChild(strokeG);

  // Add label
  const labelStyle = new TextStyle({
    fontSize: Math.max(10, Math.min(14, w / 6)),
    fill: '#333333',
    wordWrap: true,
    wordWrapWidth: Math.max(1, w - 8)
  });

  const label = new Text({ text: obj.name ?? obj.type ?? '?', style: labelStyle });
  label.anchor.set(0.5, 0.5);
  label.position.set(w / 2, d / 2);
  label.label = 'label';
  container.addChild(label);

  // Set position and rotation
  const px = PixiEditorApp.metersToPx(obj.position?.x ?? 0);
  const py = PixiEditorApp.metersToPx(obj.position?.y ?? 0);
  container.position.set(px, py);
  container.rotation = ((obj.rotation ?? 0) * Math.PI) / 180;

  container.eventMode = 'static';
  container.cursor = 'move';

  return container;
}

// Helper functions for color manipulation
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

export function setSelected(container: Container, selected: boolean): void {
  // Find existing stroke child by label
  const existingStroke = container.children.find((c) => c.label === 'stroke');
  if (existingStroke) {
    container.removeChild(existingStroke);
    existingStroke.destroy();
  }

  // Get bounds from fill graphics
  const fillChild = container.children.find((c) => c.label === 'fill');
  if (!fillChild) return;

  const bounds = (fillChild as Graphics).getLocalBounds();
  const w = bounds.width;
  const h = bounds.height;

  const newStroke = new Graphics();

  // Determine shape based on object type
  const objType = container.label ?? '';

  if (objType.includes('round_table') || objType.includes('main_table') || objType.includes('chair')) {
    // Round shape
    const radius = Math.min(w, h) / 2;
    newStroke.circle(w / 2, h / 2, radius);
  } else if (objType.includes('arch')) {
    // Arch shape
    newStroke.arc(w / 2, h, Math.min(w, h) / 2, Math.PI, 0);
    newStroke.lineTo(w, h);
    newStroke.lineTo(0, h);
    newStroke.closePath();
  } else {
    // Default rounded rectangle
    newStroke.roundRect(bounds.x, bounds.y, w, h, 4);
  }

  if (selected) {
    newStroke.stroke({ width: SELECTION_STROKE, color: HIGHLIGHT_COLOR, alpha: 1 });
  } else {
    newStroke.stroke({ width: 1, color: '#999999', alpha: 0.6 });
  }
  newStroke.label = 'stroke';

  // Insert stroke after fill, before label
  const fillIndex = container.children.findIndex((c) => c.label === 'fill');
  container.addChildAt(newStroke, fillIndex + 1);
}

export function updateObjectPosition(container: Container, obj: SceneObject): void {
  const px = PixiEditorApp.metersToPx(obj.position?.x ?? 0);
  const py = PixiEditorApp.metersToPx(obj.position?.y ?? 0);
  container.position.set(px, py);
  container.rotation = ((obj.rotation ?? 0) * Math.PI) / 180;
}