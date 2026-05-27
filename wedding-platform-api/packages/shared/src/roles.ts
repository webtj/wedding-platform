export const BUILT_IN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  PLANNER: 'planner',
  COUPLE: 'couple'
} as const;

export type BuiltInRole = (typeof BUILT_IN_ROLES)[keyof typeof BUILT_IN_ROLES];

export const BUILT_IN_ROLE_LABELS: Record<BuiltInRole, string> = {
  [BUILT_IN_ROLES.SUPER_ADMIN]: '超级管理员',
  [BUILT_IN_ROLES.PLANNER]: '策划师',
  [BUILT_IN_ROLES.COUPLE]: '新人'
};
