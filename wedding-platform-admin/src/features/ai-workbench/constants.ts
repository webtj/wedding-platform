import { Icons } from '@/components/icons';

export type WorkbenchMode = 'image' | 'copy' | 'video' | 'ppt' | 'translate';

export interface ModeTab {
  mode: WorkbenchMode;
  label: string;
  icon: keyof typeof Icons;
  placeholder: string;
  available: boolean;
}

export const MODE_TABS: ModeTab[] = [
  {
    mode: 'image',
    label: 'AI 图像',
    icon: 'media',
    placeholder: '比如：白色奶油风迎宾牌，复古油画质感',
    available: true
  }
];

export interface StyleOption {
  id: string;
  label: string;
  icon: string;
}

export const STYLES: StyleOption[] = [
  { id: 'french_pastoral', label: '法式田园', icon: '🌾' },
  { id: 'cream', label: '奶油风', icon: '🤍' },
  { id: 'oil_painting', label: '复古油画', icon: '🎨' },
  { id: 'morandi', label: '莫兰迪', icon: '🪷' },
  { id: 'hand_drawn_floral', label: '手绘花卉', icon: '🌷' },
  { id: 'french_retro', label: '法式复古', icon: '🕯️' },
  { id: 'minimalist', label: '现代极简', icon: '⚪' },
  { id: 'chinese_traditional', label: '新中式', icon: '🏮' }
];

export const STYLE_PREVIEWS: Record<string, { preview: string; hint: string }> = {
  french_pastoral: {
    preview: 'linear-gradient(135deg, #f7efe4, #d7e2c7 55%, #ffffff)',
    hint: '花园、白玫瑰、自然光'
  },
  cream: {
    preview: 'linear-gradient(135deg, #fff8ed, #eadcc9 60%, #fdfdf9)',
    hint: '柔和奶油、布纹、留白'
  },
  oil_painting: {
    preview: 'linear-gradient(135deg, #3f3228, #a9815a 50%, #f4e1c5)',
    hint: '厚涂、复古、暗调花艺'
  },
  morandi: {
    preview: 'linear-gradient(135deg, #d9d1ca, #b7c0b1 52%, #c8b6b3)',
    hint: '低饱和、温柔、克制'
  },
  hand_drawn_floral: {
    preview: 'linear-gradient(135deg, #fffdfa, #f8d9df 45%, #c8dcc3)',
    hint: '手绘线稿、花卉边框'
  },
  french_retro: {
    preview: 'linear-gradient(135deg, #efe1cf, #81674c 55%, #f8f0e6)',
    hint: '法式、旧纸张、烛光'
  },
  minimalist: {
    preview: 'linear-gradient(135deg, #ffffff, #eeeeee 60%, #d8d8d8)',
    hint: '极简、干净、现代'
  },
  chinese_traditional: {
    preview: 'linear-gradient(135deg, #f7eee4, #9b1c1f 55%, #d8ad63)',
    hint: '新中式、红金、纹样'
  }
};

export const COUNT_OPTIONS = [1, 2, 4, 6];
