export const BUILT_IN_ROLES = {
  PLANNER: 'planner'
} as const;

export type BuiltInRole = (typeof BUILT_IN_ROLES)[keyof typeof BUILT_IN_ROLES];

export const BUILT_IN_ROLE_LABELS: Record<BuiltInRole, string> = {
  [BUILT_IN_ROLES.PLANNER]: '策划师'
};
