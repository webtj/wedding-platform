import { Injectable } from '@nestjs/common';

export interface SvgTemplate {
  id: string;
  name: string;
  type: string; // vow_card, menu_card, welcome_sign, etc.
  width: number;
  height: number;
  textPositions: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily?: string;
    color?: string;
    maxWidth?: number;
    align?: 'left' | 'center' | 'right';
  }>;
}

@Injectable()
export class SvgTemplateService {
  private readonly templates: Map<string, SvgTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  private registerDefaultTemplates() {
    // Vow card template
    this.register({
      id: 'vow-card-standard',
      name: '标准誓言卡',
      type: 'vow_card',
      width: 1200,
      height: 1800,
      textPositions: [
        { id: 'title', label: '标题', x: 600, y: 200, fontSize: 48, fontFamily: 'Playfair Display', align: 'center' },
        { id: 'names', label: '新人姓名', x: 600, y: 400, fontSize: 36, align: 'center' },
        { id: 'date', label: '日期', x: 600, y: 1600, fontSize: 24, align: 'center' },
      ],
    });

    // Menu card template
    this.register({
      id: 'menu-card-standard',
      name: '标准餐卡',
      type: 'menu_card',
      width: 1200,
      height: 1800,
      textPositions: [
        { id: 'title', label: '标题', x: 600, y: 150, fontSize: 48, fontFamily: 'Playfair Display', align: 'center' },
        { id: 'items', label: '菜品列表', x: 200, y: 400, fontSize: 28, maxWidth: 800 },
      ],
    });

    // Welcome sign template
    this.register({
      id: 'welcome-sign-standard',
      name: '标准迎宾牌',
      type: 'welcome_sign',
      width: 1800,
      height: 1200,
      textPositions: [
        { id: 'title', label: '欢迎词', x: 900, y: 400, fontSize: 72, fontFamily: 'Playfair Display', align: 'center' },
        { id: 'names', label: '新人姓名', x: 900, y: 600, fontSize: 48, align: 'center' },
        { id: 'date', label: '日期', x: 900, y: 900, fontSize: 32, align: 'center' },
      ],
    });

    // Place card template (席位卡)
    this.register({
      id: 'place-card-standard',
      name: '标准席位卡',
      type: 'place_card',
      width: 600,
      height: 400,
      textPositions: [
        { id: 'names', label: '宾客姓名', x: 300, y: 160, fontSize: 42, fontFamily: 'Noto Serif SC, serif', align: 'center' },
        { id: 'title', label: '桌号/备注', x: 300, y: 260, fontSize: 24, fontFamily: 'Noto Sans SC, sans-serif', color: '#888888', align: 'center' },
        { id: 'date', label: '日期', x: 300, y: 340, fontSize: 18, fontFamily: 'Noto Sans SC, sans-serif', color: '#aaaaaa', align: 'center' },
      ],
    });

    // Guest book template (签到册)
    this.register({
      id: 'guest-book-standard',
      name: '标准签到册',
      type: 'guest_book',
      width: 1200,
      height: 1800,
      textPositions: [
        { id: 'title', label: '标题', x: 600, y: 200, fontSize: 56, fontFamily: 'Playfair Display', align: 'center' },
        { id: 'names', label: '新人姓名', x: 600, y: 380, fontSize: 40, fontFamily: 'Noto Serif SC, serif', align: 'center' },
        { id: 'date', label: '日期', x: 600, y: 500, fontSize: 28, fontFamily: 'Noto Sans SC, sans-serif', color: '#666666', align: 'center' },
        { id: 'items', label: '签到提示语', x: 600, y: 700, fontSize: 24, fontFamily: 'Noto Sans SC, sans-serif', color: '#888888', align: 'center', maxWidth: 800 },
      ],
    });

    // Thank you card template (感谢卡)
    this.register({
      id: 'thank-you-card-standard',
      name: '标准感谢卡',
      type: 'thank_you_card',
      width: 1200,
      height: 800,
      textPositions: [
        { id: 'title', label: '感谢语', x: 600, y: 250, fontSize: 48, fontFamily: 'Noto Serif SC, serif', align: 'center' },
        { id: 'names', label: '新人姓名', x: 600, y: 400, fontSize: 36, fontFamily: 'Noto Serif SC, serif', align: 'center' },
        { id: 'date', label: '日期', x: 600, y: 550, fontSize: 22, fontFamily: 'Noto Sans SC, sans-serif', color: '#888888', align: 'center' },
      ],
    });

    // Wedding program template (流程单)
    this.register({
      id: 'wedding-program-standard',
      name: '标准流程单',
      type: 'wedding_program',
      width: 800,
      height: 1200,
      textPositions: [
        { id: 'title', label: '标题', x: 400, y: 120, fontSize: 48, fontFamily: 'Playfair Display', align: 'center' },
        { id: 'names', label: '新人姓名', x: 400, y: 240, fontSize: 32, fontFamily: 'Noto Serif SC, serif', align: 'center' },
        { id: 'date', label: '日期', x: 400, y: 330, fontSize: 22, fontFamily: 'Noto Sans SC, sans-serif', color: '#666666', align: 'center' },
        { id: 'items', label: '流程项目', x: 120, y: 450, fontSize: 24, fontFamily: 'Noto Sans SC, sans-serif', maxWidth: 560 },
      ],
    });
  }

  register(template: SvgTemplate): void {
    this.templates.set(template.id, template);
  }

  get(id: string): SvgTemplate | undefined {
    return this.templates.get(id);
  }

  list(type?: string): SvgTemplate[] {
    const all = Array.from(this.templates.values());
    return type ? all.filter(t => t.type === type) : all;
  }

  getByType(type: string): SvgTemplate | undefined {
    return Array.from(this.templates.values()).find(t => t.type === type);
  }
}
