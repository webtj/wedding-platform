import { PERMISSION_METADATA } from './permissions';

export type RoleTemplateCode = 'full' | 'sales' | 'design' | 'ops' | 'readonly';

export type RoleTemplate = {
  code: RoleTemplateCode;
  name: string;
  description: string;
  permissionCodes: string[];
};

/**
 * Mirror of `@wedding/shared/src/roles.ts` ROLE_TEMPLATES. The backend is the
 * runtime authority (Role.permissionCodes String[] column); this map drives
 * the "从模板开始" picker in the role create dialog and the human-readable
 * "将获得 X 个功能" preview. Keep in sync with the API package.
 *
 * Designers never see the codes; only the template name + description. When
 * a tenant picks a template, the create payload sends `permissionCodes` to
 * the backend, which writes them straight to `role.permissionCodes`.
 */
export const ROLE_TEMPLATES: Record<RoleTemplateCode, RoleTemplate> = {
  full: {
    code: 'full',
    name: '全权管理',
    description: '总经理/老板：可访问所有功能',
    permissionCodes: [
      'member.read', 'member.manage',
      'role.read', 'role.manage',
      'lead.read', 'lead.create', 'lead.update', 'lead.convert',
      'project.read', 'project.create', 'project.update', 'project.archive',
      'scene.read', 'scene.create', 'scene.update', 'scene.delete',
      'contract.read', 'contract.manage',
      'task.read', 'task.create', 'task.assign', 'task.complete',
      'asset.read', 'asset.upload', 'asset.download',
      'timeline.read', 'timeline.manage',
      'ai.use', 'ai.generate', 'ai.generation.read', 'ai.generation.bookmark', 'ai.generation.series',
      'ai.text.generate', 'ai.text.generation.read', 'ai.text.generation.bookmark',
      'notification.read',
      'template.read', 'template.manage',
      'material.read', 'material.manage',
      'material_type.read', 'material_type.manage'
    ]
  },
  sales: {
    code: 'sales',
    name: '销售策划',
    description: '偏销售/客户对接：意向单 + 合同 + 客户',
    permissionCodes: [
      'member.read',
      'role.read',
      'lead.read', 'lead.create', 'lead.update', 'lead.convert',
      'project.read', 'project.update',
      'contract.read', 'contract.manage',
      'task.read', 'task.create', 'task.assign',
      'timeline.read',
      'ai.use', 'ai.generate', 'ai.generation.read', 'ai.generation.bookmark',
      'ai.text.generate', 'ai.text.generation.read', 'ai.text.generation.bookmark',
      'notification.read',
      'material_type.read', 'material.read'
    ]
  },
  design: {
    code: 'design',
    name: '设计策划',
    description: '偏设计/视觉：场景 + 素材 + AI',
    permissionCodes: [
      'member.read',
      'role.read',
      'project.read', 'project.update',
      'scene.read', 'scene.create', 'scene.update', 'scene.delete',
      'contract.read',
      'task.read', 'task.create', 'task.complete',
      'asset.read', 'asset.upload', 'asset.download',
      'timeline.read', 'timeline.manage',
      'ai.use', 'ai.generate', 'ai.generation.read', 'ai.generation.bookmark', 'ai.generation.series',
      'ai.text.generate', 'ai.text.generation.read', 'ai.text.generation.bookmark',
      'notification.read',
      'template.read', 'template.manage',
      'material.read', 'material.manage',
      'material_type.read', 'material_type.manage'
    ]
  },
  ops: {
    code: 'ops',
    name: '运营督导',
    description: '偏运营/项目执行：任务 + 日程 + 物料',
    permissionCodes: [
      'member.read',
      'role.read',
      'project.read', 'project.update', 'project.archive',
      'scene.read', 'scene.update',
      'contract.read',
      'task.read', 'task.create', 'task.assign', 'task.complete',
      'asset.read', 'asset.upload',
      'timeline.read', 'timeline.manage',
      'ai.use', 'ai.generation.read',
      'ai.text.generation.read',
      'notification.read',
      'material.read', 'material.manage',
      'material_type.read'
    ]
  },
  readonly: {
    code: 'readonly',
    name: '只读访客',
    description: '只读：可查看所有业务数据，但不能编辑',
    permissionCodes: [
      'member.read',
      'role.read',
      'lead.read',
      'project.read',
      'scene.read',
      'contract.read',
      'task.read',
      'asset.read',
      'timeline.read',
      'ai.generation.read', 'ai.text.generation.read',
      'notification.read',
      'template.read',
      'material.read', 'material_type.read'
    ]
  }
};

export const ROLE_TEMPLATE_CODES: RoleTemplateCode[] = ['full', 'sales', 'design', 'ops', 'readonly'];

/**
 * Group a role's permission codes by business function for the human-readable
 * preview. Codes not present in PERMISSION_METADATA (shouldn't happen, but
 * defensive) are bucketed into "other" so the UI never crashes.
 */
export type PermissionGroupSummary = {
  group: string;
  codes: string[];
  descriptions: string[];
};

export function summarizePermissionGroups(codes: string[]): PermissionGroupSummary[] {
  const grouped = new Map<string, string[]>();
  for (const code of codes) {
    const meta = PERMISSION_METADATA[code];
    const group = meta?.group ?? 'other';
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(code);
  }
  return Array.from(grouped.entries())
    .map(([group, codes]) => ({
      group,
      codes,
      descriptions: codes.map((c) => PERMISSION_METADATA[c]?.description ?? c)
    }))
    .toSorted((a, b) => a.group.localeCompare(b.group));
}
