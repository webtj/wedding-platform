export type MaterialStatus = 'available' | 'missing';

export const STATUS_OPTIONS: { value: MaterialStatus; label: string }[] = [
  { value: 'available', label: '已有' },
  { value: 'missing', label: '缺失' }
];

export const STATUS_LABEL: Record<MaterialStatus, string> = {
  available: '已有',
  missing: '缺失'
};

export type MaterialTemplate = { name: string; items: string[] };

export const WEDDING_MATERIAL_TEMPLATE: MaterialTemplate[] = [
  {
    name: '签到迎宾',
    items: ['签到台', '迎宾牌', '桌花', '签到本', '笔', '红包袋', '指引牌', '胸花', '礼金本']
  },
  {
    name: '仪式布置',
    items: ['主背景', '路引', '花瓣', '气球', '拱门', '誓言卡', '戒枕', '香槟塔', '烛台']
  },
  {
    name: '餐桌用品',
    items: ['桌布', '桌旗', '餐巾', '餐盘', '刀叉', '酒杯', '席位卡', '菜单卡', '桌号牌']
  },
  {
    name: '灯光音响',
    items: ['追光灯', '帕灯', '摇头灯', '音响', '话筒', '调音台', 'DJ台', '地灯', '星空幕布']
  },
  {
    name: '花艺装饰',
    items: ['新娘手捧', '胸花', '腕花', '车头花', '门厅花', '主桌花', '客桌花', '花艺师工具', '备用花材']
  },
  {
    name: '甜品蛋糕',
    items: ['主蛋糕', '甜品台', '蛋糕刀', '甜品叉', '餐盘', '一次性手套', '蜡烛', '火柴', '切蛋糕道具']
  },
  {
    name: '服装造型',
    items: ['婚纱', '礼服', '秀禾服', '西装', '伴娘服', '妈妈装', '敬酒服', '头饰', '饰品']
  },
  {
    name: '婚车车队',
    items: ['主婚车', '副车', '车队贴纸', '拉花', '香槟', '喜糖', '红包', '急救包', '司机联系卡']
  },
  {
    name: '伴手礼',
    items: ['伴手礼盒', '喜糖', '喜烟', '巧克力', '茶杯', '香薰', '签', '包装纸', '丝带']
  },
  {
    name: '流程道具',
    items: ['司仪稿', '流程单', '时间表', '应急方案', '备品清单', '接亲道具', '堵门红包', '游戏道具', '拍照道具']
  }
];
