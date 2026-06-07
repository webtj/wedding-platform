// Shared mapping from MaterialType.icon (emoji string in DB) → Tabler icon.
//
// Why a single source of truth: the AI workbench (composer-chips.tsx) and the
// material-types manager both need to render the icon for a MaterialType.
// Rendering `{m.icon}` directly shows the raw emoji, which renders poorly on
// systems without color emoji fonts (e.g. some Linux/headless setups show the
// emoji as a black-and-white glyph with weird baseline artifacts). Looking
// up the icon here gives us a clean Tabler SVG everywhere.
import { Icons } from '@/components/icons';
import type { Icon as TablerIcon } from '@/components/icons';

export const ICON_OPTIONS: { icon: TablerIcon; label: string; value: string }[] = [
  { icon: Icons.heart, label: '爱心', value: '💍' },
  { icon: Icons.diamond, label: '钻戒', value: '💎' },
  { icon: Icons.pro, label: '皇冠', value: '👑' },
  { icon: Icons.champagne, label: '香槟杯', value: '🥂' },
  { icon: Icons.confetti, label: '彩带', value: '🎊' },
  { icon: Icons.balloon, label: '气球', value: '🎈' },
  { icon: Icons.notification, label: '铃铛', value: '🔔' },
  { icon: Icons.candle, label: '蜡烛', value: '🕯️' },
  { icon: Icons.pennant, label: '旗帜', value: '🎏' },
  { icon: Icons.flower, label: '花朵', value: '🌸' },
  { icon: Icons.leaf, label: '绿叶', value: '🍃' },
  { icon: Icons.butterfly, label: '蝴蝶', value: '🦋' },
  { icon: Icons.cake, label: '蛋糕', value: '🍽️' },
  { icon: Icons.gift, label: '礼物', value: '🍬' },
  { icon: Icons.mail, label: '信件', value: '💌' },
  { icon: Icons.handStop, label: '手卡', value: '🤚' },
  { icon: Icons.sticker, label: '贴纸', value: '✨' },
  { icon: Icons.ticket, label: '票券', value: '🎫' },
  { icon: Icons.tag, label: '吊牌', value: '🏷️' },
  { icon: Icons.bookmark, label: '书签', value: '🔖' },
  { icon: Icons.award, label: '奖章', value: '🏅' },
  { icon: Icons.wallpaper, label: '背景墙', value: '🖼️' },
  { icon: Icons.table, label: '桌卡', value: '📋' },
  { icon: Icons.album, label: '相册', value: '📖' },
  { icon: Icons.frame, label: '相框', value: '🪟' },
  { icon: Icons.projector, label: '投影', value: '📽️' },
  { icon: Icons.clipboardList, label: '清单', value: '📝' },
  { icon: Icons.media, label: '照片', value: '📷' },
  { icon: Icons.camera, label: '相机', value: '📸' },
  { icon: Icons.music, label: '音乐', value: '🎵' },
  { icon: Icons.book, label: '书本', value: '📖' },
  { icon: Icons.palette, label: '调色盘', value: '🎨' },
  { icon: Icons.brush, label: '画笔', value: '🖌️' },
  { icon: Icons.scissors, label: '剪刀', value: '✂️' },
  { icon: Icons.ruler, label: '尺子', value: '📏' },
  { icon: Icons.wand, label: '魔法棒', value: '🪄' },
  { icon: Icons.sparkles, label: '星光', value: '✨' },
  { icon: Icons.calendar, label: '日历', value: '📅' },
  { icon: Icons.clock, label: '时钟', value: '🕐' },
  { icon: Icons.map, label: '地图', value: '🗺️' },
  { icon: Icons.home, label: '场地', value: '🏠' },
  { icon: Icons.sun, label: '太阳', value: '☀️' },
  { icon: Icons.star, label: '星星', value: '⭐' },
  { icon: Icons.post, label: '文件', value: '📄' }
];

// Seed data uses some emojis that aren't in the ICON_OPTIONS picker. Map them
// to the closest semantic Tabler icon so the AI workbench always renders a
// proper SVG instead of a possibly-unrenderable emoji.
const SEED_ICON_FALLBACKS: Record<string, TablerIcon> = {
  // 桌布 (tablecloth) — closest to a needle/thread / fabric
  '🧵': Icons.needle,
  // 签到本 (guestbook) — notebook
  '🪭': Icons.notebook,
  // 桌号牌 (table number card) — hash
  '🔢': Icons.hash
};

const ICON_MAP: Record<string, TablerIcon> = Object.fromEntries(
  ICON_OPTIONS.map((opt) => [opt.value, opt.icon])
);

export function getMaterialTypeIcon(iconStr?: string | null): TablerIcon {
  if (!iconStr) return Icons.post;
  return ICON_MAP[iconStr] ?? SEED_ICON_FALLBACKS[iconStr] ?? Icons.post;
}
