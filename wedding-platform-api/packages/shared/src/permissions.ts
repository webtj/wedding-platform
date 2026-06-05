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
  CLIENT_READ: 'client.read',
  CLIENT_MANAGE: 'client.manage',
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
