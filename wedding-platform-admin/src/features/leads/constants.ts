export const STATUS_OPTIONS = [
  { label: '未沟通', value: 'new' },
  { label: '已联系', value: 'contacted' },
  { label: '已报价', value: 'quoted' },
  { label: '洽谈中', value: 'negotiating' },
  { label: '洽谈成功', value: 'won' },
  { label: '已流失', value: 'lost' }
] as const;

export const S_COLOR: Record<string, string> = {
  new: 'bg-slate-50 text-slate-500 border-slate-200',
  contacted: 'bg-sky-50 text-sky-600 border-sky-200',
  quoted: 'bg-amber-50 text-amber-600 border-amber-200',
  negotiating: 'bg-violet-50 text-violet-600 border-violet-200',
  won: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  lost: 'bg-rose-50 text-rose-500 border-rose-200'
};

export const S_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label])
);

export const SOURCE_OPTIONS = [
  { label: '微信', value: 'wechat' },
  { label: '小红书', value: 'xiaohongshu' },
  { label: '抖音', value: 'douyin' },
  { label: '转介绍', value: 'referral' },
  { label: '其他', value: 'other' }
] as const;

export const SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map((s) => [s.value, s.label])
);
