export const BUILT_IN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  PLATFORM_ADMIN: 'platform_admin',
  PLANNER: 'planner'
} as const;

export type BuiltInRoleCode = (typeof BUILT_IN_ROLES)[keyof typeof BUILT_IN_ROLES];

export const BUILT_IN_ROLE_LABELS: Record<BuiltInRoleCode, string> = {
  [BUILT_IN_ROLES.SUPER_ADMIN]: '超级管理员',
  [BUILT_IN_ROLES.PLATFORM_ADMIN]: '平台管理员',
  [BUILT_IN_ROLES.PLANNER]: '策划师'
};

/**
 * Role templates — pre-baked permission sets a tenant can apply to a custom
 * role with one click. The 5 templates cover ~95% of wedding-planning team
 * shapes; the rare custom case still falls back to manual menu assignment.
 *
 * Codes are the union of menu permissionCodes the template would grant. The
 * frontend never shows these codes; it only shows the human-readable
 * description from PERMISSION_METADATA grouped by business function.
 */
export const ROLE_TEMPLATES = {
  /** All permissions — owner/总经理. */
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
  /** Sales-heavy: 销售型策划师, 偏 lead + client + contract. */
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
      'notification.read',
      'material_type.read', 'material.read'
    ]
  },
  /** Design-heavy: 设计型策划师, 偏 scene + asset + ai. */
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
  /** Operations-heavy: 运营/督导, 偏 task + timeline + material. */
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
      'notification.read',
      'material.read', 'material.manage',
      'material_type.read'
    ]
  },
  /** Read-only: 财务/老板助理, 只看不动. */
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
} as const;

export type RoleTemplateCode = keyof typeof ROLE_TEMPLATES;
export const ROLE_TEMPLATE_CODES = Object.keys(ROLE_TEMPLATES) as RoleTemplateCode[];
