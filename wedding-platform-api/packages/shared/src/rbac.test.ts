import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from './permissions';
import { BUILT_IN_ROLES } from './roles';
import { BUILT_IN_ROLE_PERMISSIONS, hasPermission } from './rbac';

describe('built-in role permissions', () => {
  it('gives planner access to lead conversion', () => {
    expect(BUILT_IN_ROLE_PERMISSIONS[BUILT_IN_ROLES.PLANNER]).toContain(PERMISSIONS.LEAD_CONVERT);
  });

  it('gives couple no tenant management permission', () => {
    expect(BUILT_IN_ROLE_PERMISSIONS[BUILT_IN_ROLES.COUPLE]).not.toContain(PERMISSIONS.TENANT_MANAGE);
  });

  it('checks permission membership', () => {
    expect(hasPermission([PERMISSIONS.PROJECT_READ], PERMISSIONS.PROJECT_READ)).toBe(true);
    expect(hasPermission([PERMISSIONS.PROJECT_READ], PERMISSIONS.PROJECT_UPDATE)).toBe(false);
  });
});
