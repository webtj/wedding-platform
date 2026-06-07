import { describe, expect, it } from 'vitest';
import { BUILT_IN_ROLES, BUILT_IN_ROLE_LABELS, ROLE_TEMPLATES, ROLE_TEMPLATE_CODES } from './roles';
import {
  PERMISSIONS,
  PERMISSION_METADATA,
  summarizePermissionGroups
} from './permissions';

describe('BUILT_IN_ROLES', () => {
  it('pins SUPER_ADMIN to "super_admin" to prevent drift across seed/imports (#4)', () => {
    expect(BUILT_IN_ROLES.SUPER_ADMIN).toBe('super_admin');
  });

  it('has a Chinese label for every built-in code', () => {
    for (const code of Object.values(BUILT_IN_ROLES)) {
      expect(BUILT_IN_ROLE_LABELS[code], `missing label for ${code}`).toBeTruthy();
    }
  });
});

describe('ROLE_TEMPLATES', () => {
  it('exposes the 5 expected templates with stable codes', () => {
    expect(ROLE_TEMPLATE_CODES.sort()).toEqual(['design', 'full', 'ops', 'readonly', 'sales']);
  });

  it('every template has a name and description', () => {
    for (const code of ROLE_TEMPLATE_CODES) {
      const t = ROLE_TEMPLATES[code];
      expect(t.name, `${code}.name`).toBeTruthy();
      expect(t.description, `${code}.description`).toBeTruthy();
      expect(t.code).toBe(code);
    }
  });

  it('every permission code in every template is a known permission', () => {
    for (const code of ROLE_TEMPLATE_CODES) {
      for (const perm of ROLE_TEMPLATES[code].permissionCodes) {
        expect(
          Object.values(PERMISSIONS).includes(perm as never),
          `${code} references unknown permission "${perm}"`
        ).toBe(true);
        expect(
          PERMISSION_METADATA[perm],
          `${code} references permission "${perm}" which has no metadata entry`
        ).toBeDefined();
      }
    }
  });

  it('the "full" template grants the most permissions and is a superset of the other templates\' reads', () => {
    const fullSet = new Set(ROLE_TEMPLATES.full.permissionCodes);
    expect(fullSet.size).toBeGreaterThan(ROLE_TEMPLATES.sales.permissionCodes.length);
    expect(fullSet.size).toBeGreaterThan(ROLE_TEMPLATES.design.permissionCodes.length);
    expect(fullSet.size).toBeGreaterThan(ROLE_TEMPLATES.ops.permissionCodes.length);
    expect(fullSet.size).toBeGreaterThan(ROLE_TEMPLATES.readonly.permissionCodes.length);

    // The "readonly" template should be a subset of "full" (every readonly code is in full).
    for (const c of ROLE_TEMPLATES.readonly.permissionCodes) {
      expect(fullSet.has(c), `readonly contains "${c}" but full does not`).toBe(true);
    }
  });

  it('all templates deduplicate their permissionCodes (no list contains a duplicate)', () => {
    for (const code of ROLE_TEMPLATE_CODES) {
      const list = ROLE_TEMPLATES[code].permissionCodes;
      expect(new Set(list).size, `${code} has duplicate codes`).toBe(list.length);
    }
  });

  it('summarizePermissionGroups buckets every code with metadata into the right group and alphabetizes', () => {
    const out = summarizePermissionGroups([
      'lead.create',
      'member.read',
      'ai.use',
      'lead.create' // duplicate
    ]);
    const groups = out.map((g) => g.group);
    expect(groups).toEqual(['ai', 'lead', 'member']);
    expect(out.find((g) => g.group === 'lead')!.codes).toEqual([
      'lead.create',
      'lead.create'
    ]);
    expect(out.find((g) => g.group === 'lead')!.descriptions).toEqual([
      '新建意向单',
      '新建意向单'
    ]);
  });

  it('summarizePermissionGroups buckets unknown codes under "other"', () => {
    const out = summarizePermissionGroups(['not.a.real.code', 'lead.read']);
    const other = out.find((g) => g.group === 'other');
    expect(other?.codes).toEqual(['not.a.real.code']);
    expect(other?.descriptions).toEqual(['not.a.real.code']);
  });

  it('summarizePermissionGroups returns [] for an empty list', () => {
    expect(summarizePermissionGroups([])).toEqual([]);
  });
});
