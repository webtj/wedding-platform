import type { MaterialDef, MaterialCategory } from '../api/types';

export const MATERIAL_CATEGORIES: Array<{ id: MaterialCategory; label: string }> = [
  { id: 'stage', label: '舞台' },
  { id: 'table', label: '桌椅' },
  { id: 'ceremony', label: '仪式' },
  { id: 'entrance', label: '入口' },
  { id: 'decoration', label: '装饰' },
  { id: 'functional', label: '功能区' }
];

export const P0_MATERIALS: MaterialDef[] = [
  {
    type: 'main_stage',
    category: 'stage',
    name: '主舞台',
    icon: 'stage',
    defaultSize: { width: 8, depth: 4, height: 0.6 },
    color: '#8B7355',
    business: { isMainStage: true }
  },
  {
    type: 'catwalk',
    category: 'stage',
    name: 'T台',
    icon: 'catwalk',
    defaultSize: { width: 2, depth: 10, height: 0.15 },
    color: '#D4C5A9'
  },
  {
    type: 'background_wall',
    category: 'stage',
    name: '背景墙',
    icon: 'wall',
    defaultSize: { width: 10, depth: 0.3, height: 3 },
    color: '#F5F0E8'
  },
  {
    type: 'round_table',
    category: 'table',
    name: '圆桌',
    icon: 'table-round',
    defaultSize: { width: 1.8, depth: 1.8, height: 0.75 },
    color: '#F3E3C3',
    business: { seats: 10, tableNo: '' }
  },
  {
    type: 'rect_table',
    category: 'table',
    name: '长桌',
    icon: 'table-rect',
    defaultSize: { width: 2.4, depth: 1.2, height: 0.75 },
    color: '#E8DCC8',
    business: { seats: 8, tableNo: '' }
  },
  {
    type: 'chair',
    category: 'table',
    name: '椅子',
    icon: 'chair',
    defaultSize: { width: 0.5, depth: 0.5, height: 0.9 },
    color: '#C9B896'
  },
  {
    type: 'main_table',
    category: 'table',
    name: '主桌',
    icon: 'crown',
    defaultSize: { width: 3, depth: 1.5, height: 0.75 },
    color: '#D4AF37',
    business: { seats: 12, isMainTable: true, tableNo: '主桌' }
  },
  {
    type: 'arch',
    category: 'ceremony',
    name: '拱门',
    icon: 'arch',
    defaultSize: { width: 3, depth: 0.5, height: 2.5 },
    color: '#90EE90'
  },
  {
    type: 'entrance',
    category: 'entrance',
    name: '入口',
    icon: 'door',
    defaultSize: { width: 2, depth: 0.5, height: 0 },
    color: '#87CEEB'
  }
];

export function getMaterialsByCategory(category: MaterialCategory): MaterialDef[] {
  return P0_MATERIALS.filter((m) => m.category === category);
}
