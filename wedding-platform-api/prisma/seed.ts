import { PrismaClient, AuthProvider, RoleScope } from '@prisma/client';
import { ALL_PERMISSION_CODES, BUILT_IN_ROLE_LABELS, BUILT_IN_ROLE_PERMISSIONS, BUILT_IN_ROLES } from '@wedding/shared';
import bcrypt from 'bcryptjs';
import {
  SEED_NATURE_PASSWORD,
  SEED_ROOT_PASSWORD,
  warnIfUsingDefaultSeedPasswords
} from './seed-credentials';

warnIfUsingDefaultSeedPasswords();

const prisma = new PrismaClient();

const permissionGroup = (code: string) => code.split('.')[0] ?? 'system';

async function upsertPasswordUser(input: {
  identifier: string;
  password: string;
  displayName: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  const existing = await prisma.authAccount.findUnique({
    where: {
      provider_identifier: {
        provider: AuthProvider.password,
        identifier: input.identifier
      }
    },
    include: {
      user: true
    }
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: {
        displayName: input.displayName,
        status: 'active'
      }
    });
    await prisma.authAccount.update({
      where: { id: existing.id },
      data: { passwordHash }
    });
    return existing.user;
  }

  return prisma.user.create({
    data: {
      displayName: input.displayName,
      authAccounts: {
        create: {
          provider: AuthProvider.password,
          identifier: input.identifier,
          passwordHash,
          verifiedAt: new Date()
        }
      }
    }
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_FORCE) {
    console.error('❌ 禁止在生产环境运行 seed，如需强制请设置 SEED_FORCE=true');
    process.exit(1);
  }
  console.log('🌱 开始初始化数据库...');

  // 0. Clean up accounts/roles outside the two built-in seed accounts.
  // Keep only: identifier='root' and identifier='nature'.
  // Cascade: any non-seed user → their authAccounts, tenantMembers, memberRoles,
  //          platformAdmin record. Also drop any non-seed role + its joins.
  console.log('  🧹 清理非 seed 账号/角色...');
  const seedIdentifiers = ['root', 'nature'];

  // Find non-seed auth accounts
  const staleAccounts = await prisma.authAccount.findMany({
    where: { identifier: { notIn: seedIdentifiers } },
    select: { userId: true }
  });
  const staleUserIds = [...new Set(staleAccounts.map((a) => a.userId))];

  if (staleUserIds.length > 0) {
    await prisma.refreshSession.deleteMany({ where: { userId: { in: staleUserIds } } });
    await prisma.memberRole.deleteMany({ where: { member: { userId: { in: staleUserIds } } } });
    await prisma.tenantMember.deleteMany({ where: { userId: { in: staleUserIds } } });
    await prisma.platformAdmin.deleteMany({ where: { userId: { in: staleUserIds } } });
    await prisma.authAccount.deleteMany({ where: { userId: { in: staleUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: staleUserIds } } });
    console.log(`    删除 ${staleUserIds.length} 个非 seed 用户`);
  }

  // Drop any role that is not a built-in (planner) in any tenant
  const builtInCodes = [BUILT_IN_ROLES.PLANNER];

  // Clean up stale tenant memberships for platform admins (privacy boundary)
  const platformAdminUserIds = await prisma.platformAdmin.findMany({
    select: { userId: true }
  });
  if (platformAdminUserIds.length > 0) {
    const paIds = platformAdminUserIds.map((pa) => pa.userId);
    const orphanMembers = await prisma.tenantMember.findMany({
      where: { userId: { in: paIds } },
      select: { id: true }
    });
    if (orphanMembers.length > 0) {
      await prisma.memberRole.deleteMany({ where: { memberId: { in: orphanMembers.map((m) => m.id) } } });
      await prisma.tenantMember.deleteMany({ where: { id: { in: orphanMembers.map((m) => m.id) } } });
      console.log(`    清理 ${orphanMembers.length} 个平台管理员的租户成员`);
    }
  }

  const staleRoles = await prisma.role.findMany({
    where: {
      code: { notIn: builtInCodes }
    },
    select: { id: true }
  });
  const staleRoleIds = staleRoles.map((r) => r.id);

  if (staleRoleIds.length > 0) {
    await prisma.roleMenuItem.deleteMany({ where: { roleId: { in: staleRoleIds } } });
    await prisma.memberRole.deleteMany({ where: { roleId: { in: staleRoleIds } } });
    await prisma.role.deleteMany({ where: { id: { in: staleRoleIds } } });
    console.log(`    删除 ${staleRoleIds.length} 个非 seed 角色`);
  }

  // Built-in roles in the seed tenant are refreshed via role.permissionCodes
  // (the single source of truth). No intermediate role_permission table to clear.
  const builtinRolesInSeedTenant = await prisma.role.findMany({
    where: {
      scope: RoleScope.tenant,
      tenantId: 'zirangongsheng',
      code: { in: builtInCodes }
    },
    select: { id: true }
  });
  const builtinRoleIds = builtinRolesInSeedTenant.map((r) => r.id);

  // 1. Upsert all permissions from ALL_PERMISSION_CODES
  console.log('  📋 创建权限...');
  for (const code of ALL_PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { code },
      update: {
        name: code,
        group: permissionGroup(code)
      },
      create: {
        code,
        name: code,
        group: permissionGroup(code)
      }
    });
  }

  // 2. Create default tenant - 自然共生
  console.log('  🏢 创建默认租户...');
  const defaultTenantRows = await prisma.$queryRaw<any[]>`INSERT INTO tenants (id, name, description, status, "createdAt", "updatedAt")
    VALUES ('zirangongsheng', '自然共生', '专注自然风格婚礼策划，提供全案定制服务。', 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET name = '自然共生', description = '专注自然风格婚礼策划，提供全案定制服务。'
    RETURNING *`;
  const defaultTenant = defaultTenantRows[0];

  // 3. Create tenant roles - planner (nature)
  console.log('  👤 创建角色...');
  const tenantRoleCodes = [BUILT_IN_ROLES.PLANNER] as const;
  const tenantRoles = await Promise.all(
    tenantRoleCodes.map((roleCode) => {
      const label = BUILT_IN_ROLE_LABELS[roleCode];
      return prisma.role.upsert({
        where: {
          scope_tenantId_code: {
            scope: RoleScope.tenant,
            tenantId: defaultTenant.id,
            code: roleCode
          }
        },
        update: {
          name: label,
          isBuiltIn: true
        },
        create: {
          scope: RoleScope.tenant,
          tenantId: defaultTenant.id,
          code: roleCode,
          name: label,
          isBuiltIn: true
        }
      });
    })
  );

  // 5. Set role.permissionCodes as the single source of truth.
  // Assign permissionCodes from BUILT_IN_ROLE_PERMISSIONS.
  console.log('  🔑 分配权限...');
  for (const role of tenantRoles) {
    const permissionCodes = BUILT_IN_ROLE_PERMISSIONS[role.code] ?? [];
    await prisma.role.update({
      where: { id: role.id },
      data: { permissionCodes }
    });
  }

  // 6. Create users - root (super admin) and nature (planner)
  console.log('  👥 创建用户...');
  // Seed accounts (passwords read from env vars SEED_ROOT_PASSWORD / SEED_NATURE_PASSWORD):
  //   root    → platform super admin (no tenant membership, privacy boundary)
  //   nature  → tenant planner
  const rootUser = await upsertPasswordUser({
    identifier: 'root',
    password: SEED_ROOT_PASSWORD,
    displayName: '超级管理员'
  });

  // Create platform admin for root user
  await prisma.platformAdmin.upsert({
    where: { userId: rootUser.id },
    update: {},
    create: {
      userId: rootUser.id,
      level: 'super'
    }
  });
  console.log('  ✅ 平台管理员已创建');

  // root is platform-only (PlatformAdmin, level=super). No tenant membership —
  // the privacy boundary prevents platform admins from accessing tenant data.

  const natureUser = await upsertPasswordUser({
    identifier: 'nature',
    password: SEED_NATURE_PASSWORD,
    displayName: '自然共生策划'
  });

  // 7. Create tenant memberships and assign roles
  console.log('  🔗 关联用户与角色...');
  const natureMember = await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: defaultTenant.id,
        userId: natureUser.id
      }
    },
    update: {
      displayName: '自然共生策划',
      status: 'active'
    },
    create: {
      tenantId: defaultTenant.id,
      userId: natureUser.id,
      displayName: '自然共生策划'
    }
  });

  const plannerRole = tenantRoles.find((role) => role.code === BUILT_IN_ROLES.PLANNER);

  if (plannerRole) {
    await prisma.memberRole.upsert({
      where: {
        memberId_roleId: {
          memberId: natureMember.id,
          roleId: plannerRole.id
        }
      },
      update: {},
      create: {
        memberId: natureMember.id,
        roleId: plannerRole.id
      }
    });
  }

  // ── Wedding Process Template ─────────────────────────────────
  console.log('  💒 创建婚礼流程模板...');

  const existingTemplate = await prisma.processTemplate.findFirst({
    where: { tenantId: defaultTenant.id, name: '标准婚礼全流程' }
  });

  if (!existingTemplate) {
    const tpl = await prisma.processTemplate.create({
      data: {
        tenantId: defaultTenant.id,
        name: '标准婚礼全流程',
        description: '从接单到婚礼结束的完整流程模板，覆盖策划、设计、物料、执行、收尾全阶段',
        category: '通用'
      }
    });

    const stageData = [
      { name: '接单确认', description: '确认新人意向、审核信息、签订合同', tasks: [
        { title: '审核新人基础信息', assigneeType: 'planner', priority: 3, offsetDays: 1 },
        { title: '确认婚期与场地档期', assigneeType: 'planner', priority: 3, offsetDays: 1 },
        { title: '签订婚礼策划服务合同', assigneeType: 'planner', priority: 3, offsetDays: 2 },
        { title: '收取定金并开票', assigneeType: 'planner', priority: 2, offsetDays: 2 },
        { title: '建立项目档案', assigneeType: 'planner', priority: 2, offsetDays: 3 }
      ]},
      { name: '需求沟通', description: '深入了解新人喜好、风格倾向、预算范围', tasks: [
        { title: '安排首次面谈沟通', assigneeType: 'planner', priority: 3, offsetDays: 3 },
        { title: '婚礼需求问卷整理', assigneeType: 'planner', priority: 2, offsetDays: 3 },
        { title: '收集新人爱情故事与照片素材', assigneeType: 'planner', priority: 1, offsetDays: 4 },
        { title: '确认婚礼风格方向（色系/主题）', assigneeType: 'planner', priority: 3, offsetDays: 5 },
        { title: '梳理宾客名单与桌数预估', assigneeType: 'planner', priority: 2, offsetDays: 5 },
        { title: '确认整体预算分配方案', assigneeType: 'planner', priority: 2, offsetDays: 5 }
      ]},
      { name: '方案设计', description: '主视觉设计、物料清单、场地规划', tasks: [
        { title: '主视觉方案设计（LOGO/主KV）', assigneeType: 'planner', priority: 3, offsetDays: 5 },
        { title: '迎宾牌设计', assigneeType: 'planner', priority: 3, offsetDays: 6 },
        { title: '誓言卡设计', assigneeType: 'planner', priority: 2, offsetDays: 6 },
        { title: '餐卡与桌号牌设计', assigneeType: 'planner', priority: 1, offsetDays: 7 },
        { title: '座位图设计', assigneeType: 'planner', priority: 2, offsetDays: 7 },
        { title: '流程单与手卡设计', assigneeType: 'planner', priority: 1, offsetDays: 7 },
        { title: '客户确认设计方案', assigneeType: 'planner', priority: 3, offsetDays: 8 },
        { title: '方案修改与定稿', assigneeType: 'planner', priority: 3, offsetDays: 9 }
      ]},
      { name: '供应商对接', description: '联系并确认各供应商档期与需求', tasks: [
        { title: '确认花艺供应商及花材清单', assigneeType: 'planner', priority: 3, offsetDays: 5 },
        { title: '确认摄影摄像团队', assigneeType: 'planner', priority: 3, offsetDays: 5 },
        { title: '确认化妆造型团队', assigneeType: 'planner', priority: 2, offsetDays: 6 },
        { title: '确认灯光音响供应商', assigneeType: 'planner', priority: 2, offsetDays: 6 },
        { title: '确认主持人/司仪', assigneeType: 'planner', priority: 3, offsetDays: 7 },
        { title: '确认甜品台/蛋糕供应商', assigneeType: 'planner', priority: 1, offsetDays: 7 },
        { title: '确认婚车租赁', assigneeType: 'planner', priority: 2, offsetDays: 8 }
      ]},
      { name: '物料制作', description: '所有印刷品、道具、花艺的制作与验收', tasks: [
        { title: '印刷品打样并送审', assigneeType: 'planner', priority: 3, offsetDays: 6 },
        { title: '客户确认印刷品样品', assigneeType: 'planner', priority: 3, offsetDays: 7 },
        { title: '批量印刷制作', assigneeType: 'planner', priority: 2, offsetDays: 8 },
        { title: '花艺打样确认', assigneeType: 'planner', priority: 2, offsetDays: 8 },
        { title: '道具制作/租赁清单确认', assigneeType: 'planner', priority: 2, offsetDays: 9 },
        { title: '物料到货验收与入库', assigneeType: 'planner', priority: 3, offsetDays: 10 },
        { title: '专属物品准备（戒枕/誓词卡）', assigneeType: 'planner', priority: 1, offsetDays: 10 }
      ]},
      { name: '现场布置', description: '婚礼前一天的场地搭建与布置', tasks: [
        { title: '场地勘查与测量复核', assigneeType: 'planner', priority: 3, offsetDays: 4 },
        { title: '舞台背景搭建', assigneeType: 'planner', priority: 3, offsetDays: 4 },
        { title: '花艺现场摆放', assigneeType: 'planner', priority: 3, offsetDays: 5 },
        { title: '灯光音响安装调试', assigneeType: 'planner', priority: 3, offsetDays: 5 },
        { title: '迎宾区布置', assigneeType: 'planner', priority: 2, offsetDays: 5 },
        { title: '甜品台布置', assigneeType: 'planner', priority: 1, offsetDays: 5 },
        { title: '照片展示区布置', assigneeType: 'planner', priority: 1, offsetDays: 5 },
        { title: '彩排走位（含主持人/新人）', assigneeType: 'planner', priority: 3, offsetDays: 6 },
        { title: '最终检查所有布置细节', assigneeType: 'planner', priority: 3, offsetDays: 6 }
      ]},
      { name: '婚礼当天', description: '婚礼日流程执行与现场统筹', tasks: [
        { title: '化妆师到岗（新娘妆造）', assigneeType: 'planner', priority: 3, offsetDays: 7 },
        { title: '摄影师到岗开始记录', assigneeType: 'planner', priority: 2, offsetDays: 7 },
        { title: '主持人到岗确认流程', assigneeType: 'planner', priority: 3, offsetDays: 7 },
        { title: '婚车/接亲流程确认', assigneeType: 'planner', priority: 3, offsetDays: 7 },
        { title: '仪式现场统筹执行', assigneeType: 'planner', priority: 3, offsetDays: 7 },
        { title: '婚宴环节协调', assigneeType: 'planner', priority: 2, offsetDays: 7 },
        { title: '突发事件应急处理', assigneeType: 'planner', priority: 3, offsetDays: 7 },
        { title: '新人换装协助', assigneeType: 'planner', priority: 1, offsetDays: 7 }
      ]},
      { name: '婚礼收尾', description: '婚礼结束后的收尾工作', tasks: [
        { title: '物料回收与清点', assigneeType: 'planner', priority: 2, offsetDays: 8 },
        { title: '供应商尾款结算', assigneeType: 'planner', priority: 3, offsetDays: 8 },
        { title: '归还租赁道具', assigneeType: 'planner', priority: 2, offsetDays: 8 },
        { title: '新人满意度回访', assigneeType: 'planner', priority: 2, offsetDays: 9 },
        { title: '整理交付照片/视频成片', assigneeType: 'planner', priority: 1, offsetDays: 10 },
        { title: '项目总结归档', assigneeType: 'planner', priority: 2, offsetDays: 10 }
      ]}
    ];

    for (const sd of stageData) {
      const stage = await prisma.processTemplateStage.create({
        data: { templateId: tpl.id, name: sd.name, description: sd.description, sortOrder: stageData.indexOf(sd) }
      });
      for (const td of sd.tasks) {
        await prisma.processTemplateTask.create({
          data: { stageId: stage.id, title: td.title, assigneeType: td.assigneeType as any, priority: td.priority, offsetDays: td.offsetDays, sortOrder: sd.tasks.indexOf(td) }
        });
      }
    }
  }

  // ── Material Types (AI Workbench) ────────────────────────────────
  console.log('  📦 创建素材管理...');

  const materialTypeData = [
    { name: '誓言卡', code: 'vow_card', icon: '💍', defaultSize: { width: 120, height: 170 } },
    { name: '餐卡', code: 'table_card', icon: '🍽️', defaultSize: { width: 100, height: 150 } },
    { name: '手卡', code: 'hand_card', icon: '🤚', defaultSize: { width: 90, height: 140 } },
    { name: '桌卡', code: 'place_card', icon: '🏷️', defaultSize: { width: 100, height: 150 } },
    { name: '照片墙', code: 'photo_wall', icon: '🖼️', defaultSize: { width: 600, height: 900 } },
    { name: '贴纸', code: 'sticker', icon: '✨', defaultSize: { width: 50, height: 50 } },
    { name: '桌布', code: 'tablecloth', icon: '🧵', defaultSize: { width: 1800, height: 1800 } },
    { name: '扇子封面', code: 'fan_cover', icon: '🪭', defaultSize: { width: 200, height: 300 } },
    { name: '签到本', code: 'guestbook', icon: '📖', defaultSize: { width: 200, height: 200 } },
    { name: '喜糖盒', code: 'candy_box', icon: '🍬', defaultSize: { width: 80, height: 80 } },
    { name: '请柬', code: 'invitation', icon: '💌', defaultSize: { width: 180, height: 120 } },
    { name: '桌号牌', code: 'table_number', icon: '🔢', defaultSize: { width: 100, height: 150 } }
  ];

  for (const mt of materialTypeData) {
    await prisma.materialType.upsert({
      where: { tenantId_code: { tenantId: defaultTenant.id, code: mt.code } },
      update: { name: mt.name, icon: mt.icon, defaultSize: mt.defaultSize, isSystem: true },
      create: {
        tenantId: defaultTenant.id,
        name: mt.name,
        code: mt.code,
        icon: mt.icon,
        defaultSize: mt.defaultSize,
        isSystem: true
      }
    });
  }

  // ── Material Categories & Materials ───────────────────────────────
  console.log('  🎨 创建物料库...');

  const demoMaterials: Record<string, string[]> = {
    '场景道具': ['餐桌（圆桌/长桌）', '桌布', '桌旗', '椅套', '椅背装饰', '拱门架子', '拱门花泥', '路引架子', '酒杯（香槟杯）', '酒杯（红酒杯）', '烛台', '蜡烛', '迎宾牌架子', '甜品台架子', '背景板支架', '舞台地台', 'T台板'],
    '花材': ['粉色绣球', '绿色绣球', '白玫瑰', '红玫瑰', '铃兰', '牡丹', '尤加利叶', '满天星', '桔梗', '洋牡丹', '蝴蝶兰', '龟背叶', '散尾葵', '粉佳人', '紫罗兰'],
    '印刷品': ['迎宾牌', '誓言卡', '手卡', '餐卡', '座位图', '流程单', '桌号牌', '菜单卡', '感谢卡', '红包', '签到本', '签名笔'],
    '灯光音响': ['追光灯', '面光灯', '染色灯', '音响', '话筒（无线）', '话筒（有线）', '投影仪', '投影幕布', '调音台', '功放', '线材包', '备用电池'],
    '人员物资': ['对讲机', '工作证', '流程手册', '急救包', '针线包', '备用丝袜', '雨伞（透明）', '暖宝宝', '防蚊液', '矿泉水', '零食补给', '充电宝'],
    '新人专属': ['婚戒', '婚鞋', '头纱', '领结/领带', '晨袍', '伴娘服', '伴郎服', '手捧花', '胸花', '手腕花', '戒枕', '誓言本']
  };

  for (const [catName, items] of Object.entries(demoMaterials)) {
    const existing = await prisma.materialCategory.findFirst({ where: { tenantId: defaultTenant.id, name: catName } });
    if (!existing) {
      const cat = await prisma.materialCategory.create({
        data: { tenantId: defaultTenant.id, name: catName, sortOrder: Object.keys(demoMaterials).indexOf(catName) }
      });
      for (let i = 0; i < items.length; i++) {
        await prisma.material.create({
          data: {
            tenantId: defaultTenant.id,
            categoryId: cat.id,
            name: items[i],
            status: i % 5 === 0 ? 'missing' : 'available',
            quantity: Math.floor(Math.random() * 20) + 1,
            sortOrder: i
          }
        });
      }
    }
  }

  // ── AI Templates ────────────────────────────────────────────────────
  console.log('  🤖 创建 AI 模板...');

  const builtInAiTemplates = [
    {
      code: 'case_study_story',
      name: '婚礼案例故事',
      category: 'case_study' as const,
      prompt: '根据婚礼风格、场地、素材和新人故事，生成一篇适合官网案例页的故事文案。'
    },
    {
      code: 'planner_marketing_xhs',
      name: '小红书案例文案',
      category: 'planner_marketing' as const,
      prompt: '根据项目亮点生成适合小红书发布的婚礼案例文案。'
    },
    {
      code: 'thank_you_note',
      name: '感谢文案',
      category: 'planner_marketing' as const,
      prompt: '为客户生成婚礼结束后的感谢亲友文案。'
    },
    {
      code: 'image_window_white_roses',
      name: '窗台白玫瑰',
      category: 'image_design' as const,
      prompt: '窗台上的白玫瑰，清晨自然光，柔和白纱，适合婚礼迎宾牌背景，画面干净高级。'
    },
    {
      code: 'image_white_rose_welcome_sign',
      name: '白玫瑰迎宾牌',
      category: 'image_design' as const,
      prompt: '白玫瑰婚礼迎宾牌，奶油白底，花艺围绕边角，中心留白，温柔高级的婚礼视觉。'
    },
    {
      code: 'image_cream_table_card',
      name: '奶油风桌卡',
      category: 'image_design' as const,
      prompt: '奶油风婚礼桌卡背景，柔和布纹纸张，浅香槟色花材，极简排版，保留文字留白。'
    },
    {
      code: 'image_chinese_red_gold_invitation',
      name: '新中式红金请柬',
      category: 'image_design' as const,
      prompt: '新中式红金婚礼请柬，宋式纹样，金色线描花卉，雅致留白，喜庆但不过度传统。'
    },
    {
      code: 'image_garden_vow_card',
      name: '花园誓言卡',
      category: 'image_design' as const,
      prompt: '户外花园婚礼誓言卡，浅绿色植物环绕，白色小花点缀，纸张质感，清新自然。'
    }
  ];

  for (const template of builtInAiTemplates) {
    const existingTemplate = await prisma.aiTemplate.findFirst({
      where: {
        tenantId: null,
        code: template.code
      }
    });

    if (existingTemplate) {
      await prisma.aiTemplate.update({
        where: { id: existingTemplate.id },
        data: {
          name: template.name,
          category: template.category,
          prompt: template.prompt,
          isBuiltIn: true
        }
      });
    } else {
      await prisma.aiTemplate.create({
        data: {
          tenantId: null,
          code: template.code,
          name: template.name,
          category: template.category,
          prompt: template.prompt,
          isBuiltIn: true
        }
      });
    }
  }

  // ── Platform Settings ──────────────────────────────────────────────
  console.log('  ⚙️ 创建平台配置...');

  const platformSettings = [
    { key: 'sms_provider', group: 'notification', label: '短信服务', value: JSON.stringify({ provider: 'disabled', signName: '婚礼平台' }) },
    { key: 'storage_limits', group: 'storage', label: '存储配额', value: JSON.stringify({ maxFileSizeMb: 100, allowedTypes: ['image/jpeg', 'image/png', 'video/mp4', 'application/pdf'] }) },
    { key: 'ai_config', group: 'ai', label: 'AI 服务配置', value: JSON.stringify({ provider: 'template', enabled: true }) }
  ];

  for (const setting of platformSettings) {
    const existing = await prisma.platformSetting.findUnique({ where: { key: setting.key } });
    if (existing) {
      await prisma.platformSetting.update({
        where: { key: setting.key },
        data: { group: setting.group, label: setting.label, value: JSON.parse(setting.value) }
      });
    } else {
      await prisma.platformSetting.create({
        data: { key: setting.key, group: setting.group, label: setting.label, value: JSON.parse(setting.value) }
      });
    }
  }

  // ── Menu Items ────────────────────────────────────────────────────
  console.log('  📋 创建菜单...');

  // Platform-level menus (super admin)
  // permissionCodes: the union of API permissions a role must hold to use this
  // menu's pages. Empty array = no API access (parent label only).
  const platformMenuData = [
    { label: '平台', icon: 'lock', sortOrder: 0, children: [
      { label: '租户管理', href: '/admin/tenants', icon: 'workspace', sortOrder: 0, permissionCodes: ['platform.setting.read', 'tenant.read'] },
      { label: '账号管理', href: '/admin/accounts', icon: 'user', sortOrder: 1, permissionCodes: ['platform.setting.read'] },
      { label: '角色管理', href: '/admin/roles', icon: 'badgeCheck', sortOrder: 2, permissionCodes: ['platform.setting.read'] },
      { label: '菜单管理', href: '/admin/menus', icon: 'forms', sortOrder: 3, permissionCodes: ['platform.setting.read'] }
    ]},
    { label: '运营', icon: 'settings', sortOrder: 1, children: [
      { label: '套餐计费', href: '/admin/billing', icon: 'billing', sortOrder: 0, permissionCodes: ['platform.setting.manage'] },
      { label: '通用设置', href: '/admin/settings', icon: 'settings', sortOrder: 1, permissionCodes: ['platform.setting.manage'] },
      { label: '素材管理', href: '/admin/material-types', icon: 'product', sortOrder: 2, permissionCodes: ['material_type.manage'] }
    ]}
  ];

  const platformMenus: any[] = [];
  for (const parentData of platformMenuData) {
    const parent = await prisma.menuItem.upsert({
      where: { id: `menu-platform-${parentData.label}` },
      update: { label: parentData.label, icon: parentData.icon, sortOrder: parentData.sortOrder },
      create: {
        id: `menu-platform-${parentData.label}`,
        scope: 'platform',
        label: parentData.label,
        icon: parentData.icon,
        sortOrder: parentData.sortOrder
      }
    });
    platformMenus.push(parent);

    for (const childData of parentData.children) {
      const child = await prisma.menuItem.upsert({
        where: { id: `menu-platform-${childData.href}` },
        update: {
          label: childData.label,
          href: childData.href,
          icon: childData.icon,
          sortOrder: childData.sortOrder,
          permissionCodes: childData.permissionCodes
        },
        create: {
          id: `menu-platform-${childData.href}`,
          scope: 'platform',
          parentId: parent.id,
          label: childData.label,
          href: childData.href,
          icon: childData.icon,
          sortOrder: childData.sortOrder,
          permissionCodes: childData.permissionCodes
        }
      });
      platformMenus.push(child);
    }
  }

  // Tenant-level menus (planner).
  // Note: /studio/projects also covers /studio/projects/:id/scenes (sub-page).
  // The scenes controller requires SCENE_*; we pack those into the parent menu
  // so a role with project access automatically gets scene access.
  const tenantMenuData = [
    { label: '工作台', icon: 'dashboard', sortOrder: 0, children: [
      { label: '总览面板', href: '/studio/overview', icon: 'dashboard', sortOrder: 0, permissionCodes: ['project.read', 'task.read'] },
      { label: '项目管理', href: '/studio/projects', icon: 'kanban', sortOrder: 1, permissionCodes: ['project.read', 'project.create', 'project.update', 'project.archive', 'scene.read', 'scene.create', 'scene.update', 'scene.delete'] }
    ]},
    { label: '商务', icon: 'billing', sortOrder: 1, children: [
      { label: '意向单', href: '/studio/leads', icon: 'user', sortOrder: 0, permissionCodes: ['lead.read', 'lead.create', 'lead.update', 'lead.convert'] },
      { label: '合同管理', href: '/studio/contracts', icon: 'post', sortOrder: 1, permissionCodes: ['contract.read', 'contract.manage'] },
      { label: '物料管理', href: '/studio/materials', icon: 'product', sortOrder: 2, permissionCodes: ['material.read', 'material.manage'] }
    ]},
    { label: 'AI 工具', icon: 'sparkles', sortOrder: 2, children: [
      { label: 'AI 工作台', href: '/studio/ai-workbench', icon: 'sparkles', sortOrder: 0, permissionCodes: ['ai.use', 'ai.generate', 'ai.generation.read', 'ai.generation.bookmark', 'ai.generation.series', 'ai.text.generate', 'ai.text.generation.read', 'ai.text.generation.bookmark'] },
      { label: '生图模板', href: '/studio/ai-workbench/templates', icon: 'palette', sortOrder: 1, permissionCodes: ['template.read', 'template.manage'] },
      { label: '素材管理', href: '/studio/material-types', icon: 'product', sortOrder: 2, permissionCodes: ['material_type.read', 'material_type.manage'] }
    ]},
    { label: '任务', icon: 'checks', sortOrder: 3, children: [
      { label: '流程模板', href: '/studio/templates', icon: 'forms', sortOrder: 0, permissionCodes: ['task.read', 'task.create', 'task.assign', 'task.complete'] },
      { label: '婚礼日程', href: '/studio/timeline', icon: 'calendar', sortOrder: 1, permissionCodes: ['timeline.read', 'timeline.manage'] }
    ]},
    { label: '团队管理', icon: 'user', sortOrder: 4, children: [
      { label: '账号管理', href: '/studio/accounts', icon: 'user', sortOrder: 0, permissionCodes: ['member.read', 'member.manage'] },
      { label: '角色管理', href: '/studio/roles', icon: 'badgeCheck', sortOrder: 1, permissionCodes: ['role.read', 'role.manage'] },
      { label: '通知中心', href: '/studio/notifications', icon: 'bell', sortOrder: 2, permissionCodes: ['notification.read'] }
    ]}
  ];

  const tenantMenus: any[] = [];
  for (const parentData of tenantMenuData) {
    const parent = await prisma.menuItem.upsert({
      where: { id: `menu-tenant-${parentData.label}` },
      update: { label: parentData.label, icon: parentData.icon, sortOrder: parentData.sortOrder },
      create: {
        id: `menu-tenant-${parentData.label}`,
        scope: 'tenant',
        tenantId: defaultTenant.id,
        label: parentData.label,
        icon: parentData.icon,
        sortOrder: parentData.sortOrder
      }
    });
    tenantMenus.push(parent);

    for (const childData of parentData.children) {
      const childScope = (childData as any).scope ?? 'tenant';
      const isPlatformScoped = childScope === 'platform';
      const child = await prisma.menuItem.upsert({
        where: { id: `menu-tenant-${childData.href}` },
        update: {
          label: childData.label,
          href: childData.href,
          icon: childData.icon,
          sortOrder: childData.sortOrder,
          scope: childScope,
          permissionCodes: childData.permissionCodes
        },
        create: {
          id: `menu-tenant-${childData.href}`,
          scope: childScope,
          ...(isPlatformScoped ? {} : { tenantId: defaultTenant.id }),
          parentId: parent.id,
          label: childData.label,
          href: childData.href,
          icon: childData.icon,
          sortOrder: childData.sortOrder,
          permissionCodes: childData.permissionCodes
        }
      });
      tenantMenus.push(child);
    }
  }

  // Assign tenant menus to planner role
  if (plannerRole) {
    for (const menu of tenantMenus) {
      await prisma.roleMenuItem.upsert({
        where: { roleId_menuItemId: { roleId: plannerRole.id, menuItemId: menu.id } },
        update: {},
        create: { roleId: plannerRole.id, menuItemId: menu.id }
      });
    }
    // Materialize role.permissionCodes as the union of its menus' permissionCodes.
    // This is the single source of truth for what the role can do at the API
    // level; identity.service.collectPermissions reads from here, not from the
    // legacy role.permissions join table.
    const plannerMenuIds = (
      await prisma.roleMenuItem.findMany({
        where: { roleId: plannerRole.id },
        select: { menuItemId: true }
      })
    ).map((rm) => rm.menuItemId);
    const selectedMenus = await prisma.menuItem.findMany({
      where: { id: { in: plannerMenuIds } },
      select: { permissionCodes: true }
    });
    const union = new Set<string>();
    for (const m of selectedMenus) {
      for (const code of m.permissionCodes) union.add(code);
    }
    await prisma.role.update({
      where: { id: plannerRole.id },
      data: { permissionCodes: Array.from(union) }
    });
  }

  console.log('✅ 数据库初始化完成！');
  console.log('');
  console.log('📋 账号信息：');
  console.log(`  超级管理员: root / ${SEED_ROOT_PASSWORD} (平台管理员)`);
  console.log(`  策划师:     nature / ${SEED_NATURE_PASSWORD} (租户: 自然共生)`);
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
