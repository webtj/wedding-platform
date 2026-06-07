export const PERMISSIONS = {
  TENANT_READ: 'tenant.read',
  TENANT_MANAGE: 'tenant.manage',
  MEMBER_READ: 'member.read',
  MEMBER_MANAGE: 'member.manage',
  ROLE_READ: 'role.read',
  ROLE_MANAGE: 'role.manage',
  LEAD_READ: 'lead.read',
  LEAD_CREATE: 'lead.create',
  LEAD_UPDATE: 'lead.update',
  LEAD_CONVERT: 'lead.convert',
  PROJECT_READ: 'project.read',
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_ARCHIVE: 'project.archive',
  SCENE_READ: 'scene.read',
  SCENE_CREATE: 'scene.create',
  SCENE_UPDATE: 'scene.update',
  SCENE_DELETE: 'scene.delete',
  CONTRACT_READ: 'contract.read',
  CONTRACT_MANAGE: 'contract.manage',
  TASK_READ: 'task.read',
  TASK_CREATE: 'task.create',
  TASK_ASSIGN: 'task.assign',
  TASK_COMPLETE: 'task.complete',
  ASSET_READ: 'asset.read',
  ASSET_UPLOAD: 'asset.upload',
  ASSET_DOWNLOAD: 'asset.download',
  TIMELINE_READ: 'timeline.read',
  TIMELINE_MANAGE: 'timeline.manage',
  AI_USE: 'ai.use',
  NOTIFICATION_READ: 'notification.read',
  PLATFORM_SETTING_READ: 'platform.setting.read',
  PLATFORM_SETTING_MANAGE: 'platform.setting.manage',
  PLATFORM_MANAGE: 'platform.manage',
  TEMPLATE_READ: 'template.read',
  TEMPLATE_MANAGE: 'template.manage',
  MATERIAL_READ: 'material.read',
  MATERIAL_MANAGE: 'material.manage',
  AI_GENERATE: 'ai.generate',
  AI_GENERATION_READ: 'ai.generation.read',
  AI_GENERATION_BOOKMARK: 'ai.generation.bookmark',
  AI_GENERATION_SERIES: 'ai.generation.series',
  MATERIAL_TYPE_READ: 'material_type.read',
  MATERIAL_TYPE_MANAGE: 'material_type.manage',
  AI_TEXT_GENERATE: 'ai.text.generate',
  AI_TEXT_GENERATION_READ: 'ai.text.generation.read',
  AI_TEXT_GENERATION_BOOKMARK: 'ai.text.generation.bookmark'
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_CODES = Object.values(PERMISSIONS);

/** Permissions that only apply to platform management */
export const PLATFORM_PERMISSION_CODES = Object.values(PERMISSIONS).filter((p) =>
  p.startsWith('platform.')
);

/** Permissions that apply to tenant business operations */
export const TENANT_PERMISSION_CODES = Object.values(PERMISSIONS).filter(
  (p) => !p.startsWith('platform.')
);

/**
 * UI metadata for each permission code.
 * - `group`: grouping key (auto-derived from the prefix before `.`).
 *   Override only when the prefix is misleading (e.g. `process_template.*`).
 * - `description`: Chinese label shown in role/menu editors and 403 panels.
 * - `scope`: 'platform' | 'tenant' | 'both'. 'both' = available in both modes
 *   (e.g. notification.read, ai.use).
 *
 * Single source of truth for both the menu editor UI and the 403 panel.
 * DB `Permission` table is the runtime authority and is seeded from the same
 * codes; this map is the human-readable mirror and must stay in sync.
 */
export const PERMISSION_METADATA: Record<
  PermissionCode,
  { group: string; description: string; scope: 'platform' | 'tenant' | 'both' }
> = {
  'tenant.read': { group: 'tenant', description: '查看租户', scope: 'platform' },
  'tenant.manage': { group: 'tenant', description: '管理租户', scope: 'platform' },
  'member.read': { group: 'member', description: '查看账号', scope: 'both' },
  'member.manage': { group: 'member', description: '管理账号', scope: 'both' },
  'role.read': { group: 'role', description: '查看角色', scope: 'both' },
  'role.manage': { group: 'role', description: '管理角色', scope: 'both' },
  'lead.read': { group: 'lead', description: '查看意向单', scope: 'tenant' },
  'lead.create': { group: 'lead', description: '新建意向单', scope: 'tenant' },
  'lead.update': { group: 'lead', description: '编辑意向单', scope: 'tenant' },
  'lead.convert': { group: 'lead', description: '转客户/合同', scope: 'tenant' },
  'project.read': { group: 'project', description: '查看项目', scope: 'tenant' },
  'project.create': { group: 'project', description: '新建项目', scope: 'tenant' },
  'project.update': { group: 'project', description: '编辑项目', scope: 'tenant' },
  'project.archive': { group: 'project', description: '归档项目', scope: 'tenant' },
  'scene.read': { group: 'scene', description: '查看场景', scope: 'tenant' },
  'scene.create': { group: 'scene', description: '新建场景', scope: 'tenant' },
  'scene.update': { group: 'scene', description: '编辑场景', scope: 'tenant' },
  'scene.delete': { group: 'scene', description: '删除场景', scope: 'tenant' },
  'contract.read': { group: 'contract', description: '查看合同', scope: 'tenant' },
  'contract.manage': { group: 'contract', description: '管理合同', scope: 'tenant' },
  'task.read': { group: 'task', description: '查看任务', scope: 'tenant' },
  'task.create': { group: 'task', description: '创建任务', scope: 'tenant' },
  'task.assign': { group: 'task', description: '分派任务', scope: 'tenant' },
  'task.complete': { group: 'task', description: '完成任务', scope: 'tenant' },
  'asset.read': { group: 'asset', description: '查看素材', scope: 'tenant' },
  'asset.upload': { group: 'asset', description: '上传素材', scope: 'tenant' },
  'asset.download': { group: 'asset', description: '下载素材', scope: 'tenant' },
  'timeline.read': { group: 'timeline', description: '查看日程', scope: 'tenant' },
  'timeline.manage': { group: 'timeline', description: '管理日程', scope: 'tenant' },
  'ai.use': { group: 'ai', description: '使用 AI', scope: 'both' },
  'notification.read': { group: 'notification', description: '查看通知', scope: 'both' },
  'platform.setting.read': {
    group: 'platform',
    description: '查看平台设置',
    scope: 'platform'
  },
  'platform.setting.manage': {
    group: 'platform',
    description: '管理平台设置',
    scope: 'platform'
  },
  'platform.manage': { group: 'platform', description: '平台总控', scope: 'platform' },
  'template.read': { group: 'template', description: '查看生图模板', scope: 'tenant' },
  'template.manage': { group: 'template', description: '管理生图模板', scope: 'tenant' },
  'material.read': { group: 'material', description: '查看物料', scope: 'tenant' },
  'material.manage': { group: 'material', description: '管理物料', scope: 'tenant' },
  'ai.generate': { group: 'ai', description: 'AI 生图', scope: 'tenant' },
  'ai.generation.read': { group: 'ai', description: '查看生图记录', scope: 'tenant' },
  'ai.generation.bookmark': {
    group: 'ai',
    description: '收藏生图记录',
    scope: 'tenant'
  },
  'ai.generation.series': { group: 'ai', description: '管理生图系列', scope: 'tenant' },
  'material_type.read': { group: 'material_type', description: '查看素材类型', scope: 'both' },
  'material_type.manage': { group: 'material_type', description: '管理素材类型', scope: 'both' },
  'ai.text.generate': { group: 'ai', description: 'AI 文案生成', scope: 'tenant' },
  'ai.text.generation.read': {
    group: 'ai',
    description: '查看文案记录',
    scope: 'tenant'
  },
  'ai.text.generation.bookmark': {
    group: 'ai',
    description: '收藏文案记录',
    scope: 'tenant'
  }
};

/** Group permissions by their `group` field, preserving declaration order. */
export function groupPermissionsByGroup(): Array<{
  group: string;
  codes: PermissionCode[];
}> {
  const out: Array<{ group: string; codes: PermissionCode[] }> = [];
  const seen = new Map<string, number>();
  for (const code of ALL_PERMISSION_CODES) {
    const group = PERMISSION_METADATA[code].group;
    const idx = seen.get(group);
    if (idx === undefined) {
      seen.set(group, out.length);
      out.push({ group, codes: [code] });
    } else {
      out[idx]!.codes.push(code);
    }
  }
  return out;
}

/**
 * Group an arbitrary list of permission codes by business function. Used by
 * the role editor's "将获得 X 项功能" preview and the role list's
 * "X 项功能 · Y 组" badge — gives planners a human-readable view of a role's
 * effective permissions without exposing the raw codes.
 *
 * Codes not present in PERMISSION_METADATA (shouldn't happen, but defensive)
 * are bucketed into "other" so the UI never crashes.
 */
export type PermissionGroupSummary = {
  group: string;
  codes: string[];
  descriptions: string[];
};

export function summarizePermissionGroups(
  codes: readonly string[]
): PermissionGroupSummary[] {
  const grouped = new Map<string, string[]>();
  for (const code of codes) {
    const meta = PERMISSION_METADATA[code as PermissionCode];
    const group = meta?.group ?? 'other';
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(code);
  }
  return Array.from(grouped.entries())
    .map(([group, codes]) => ({
      group,
      codes,
      descriptions: codes.map(
        (c) => PERMISSION_METADATA[c as PermissionCode]?.description ?? c
      )
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
}
