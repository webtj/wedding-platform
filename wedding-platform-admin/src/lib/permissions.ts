export type PermissionCode = string;

export type PermissionMetadata = {
  group: string;
  description: string;
  scope: 'platform' | 'tenant' | 'both';
};

// Mirror of `@wedding/shared/src/permissions.ts` PERMISSION_METADATA. The
// backend is the runtime authority (DB `Permission` table + JwtPayload.permissions);
// this map is the human-readable label source for the menu editor, role editor,
// and 403 panel. Keep in sync with the API package.
export const PERMISSION_METADATA: Record<PermissionCode, PermissionMetadata> = {
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
  'platform.setting.read': { group: 'platform', description: '查看平台设置', scope: 'platform' },
  'platform.setting.manage': { group: 'platform', description: '管理平台设置', scope: 'platform' },
  'platform.manage': { group: 'platform', description: '平台总控', scope: 'platform' },
  'template.read': { group: 'template', description: '查看生图模板', scope: 'tenant' },
  'template.manage': { group: 'template', description: '管理生图模板', scope: 'tenant' },
  'material.read': { group: 'material', description: '查看物料', scope: 'tenant' },
  'material.manage': { group: 'material', description: '管理物料', scope: 'tenant' },
  'ai.generate': { group: 'ai', description: 'AI 生图', scope: 'tenant' },
  'ai.generation.read': { group: 'ai', description: '查看生图记录', scope: 'tenant' },
  'ai.generation.bookmark': { group: 'ai', description: '收藏生图记录', scope: 'tenant' },
  'ai.generation.series': { group: 'ai', description: '管理生图系列', scope: 'tenant' },
  'material_type.read': { group: 'material_type', description: '查看素材类型', scope: 'both' },
  'material_type.manage': { group: 'material_type', description: '管理素材类型', scope: 'both' },
  'ai.text.generate': { group: 'ai', description: 'AI 文案生成', scope: 'tenant' },
  'ai.text.generation.read': { group: 'ai', description: '查看文案记录', scope: 'tenant' },
  'ai.text.generation.bookmark': { group: 'ai', description: '收藏文案记录', scope: 'tenant' }
};

export const ALL_PERMISSION_CODES = Object.keys(PERMISSION_METADATA);

export type PermissionGroup = {
  group: string;
  codes: PermissionCode[];
};

export function groupPermissionsByGroup(): PermissionGroup[] {
  const out: PermissionGroup[] = [];
  const seen = new Map<string, number>();
  for (const code of ALL_PERMISSION_CODES) {
    const group = PERMISSION_METADATA[code]?.group ?? 'other';
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
