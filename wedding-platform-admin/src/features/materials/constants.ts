export type MaterialStatus = 'available' | 'missing';

export const STATUS_OPTIONS: { value: MaterialStatus; label: string }[] = [
  { value: 'available', label: '已有' },
  { value: 'missing', label: '缺失' }
];

export const STATUS_LABEL: Record<MaterialStatus, string> = {
  available: '已有',
  missing: '缺失'
};
