export const STATUS_OPTIONS = [
  { label: '待签署', value: 'pending_sign' },
  { label: '已签署', value: 'signed' },
  { label: '撤销合同', value: 'voided' }
];

export const S_COLOR: Record<string, string> = {
  pending_sign: 'bg-amber-50 text-amber-700 border-amber-200',
  signed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  voided: 'bg-red-50 text-red-700 border-red-200'
};

export const S_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label])
);

export const fmtAmount = (cents: number | null | undefined): string => {
  if (cents === null || cents === undefined) return '-';
  return `¥${(cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
};
