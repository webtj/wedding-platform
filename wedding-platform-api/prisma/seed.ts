import { PrismaClient, AuthProvider, RoleScope } from '@prisma/client';
import { ALL_PERMISSION_CODES, BUILT_IN_ROLE_LABELS, BUILT_IN_ROLE_PERMISSIONS, BUILT_IN_ROLES } from '@wedding/shared';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const permissionGroup = (code: string) => code.split('.')[0] ?? 'system';

async function upsertPasswordUser(input: {
  identifier: string;
  password: string;
  displayName: string;
  isPlatformAdmin?: boolean;
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
        isPlatformAdmin: input.isPlatformAdmin ?? false,
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
      isPlatformAdmin: input.isPlatformAdmin ?? false,
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
  // 1. Upsert all permissions from ALL_PERMISSION_CODES
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

  // 2. Create default tenant
  const defaultTenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant-default' },
    update: {
      name: '默认婚礼工作室',
      description: '专注高端婚礼策划，提供全案定制服务。',
      status: 'active'
    },
    create: {
      id: 'demo-tenant-default',
      name: '默认婚礼工作室',
      description: '专注高端婚礼策划，提供全案定制服务。'
    }
  });

  // 3. Create platform role for super_admin
  const existingPlatformRole = await prisma.role.findFirst({
    where: {
      scope: RoleScope.platform,
      code: BUILT_IN_ROLES.SUPER_ADMIN
    }
  });

  const platformRole = existingPlatformRole
    ? await prisma.role.update({
        where: { id: existingPlatformRole.id },
        data: {
          name: BUILT_IN_ROLE_LABELS[BUILT_IN_ROLES.SUPER_ADMIN],
          isBuiltIn: true
        }
      })
    : await prisma.role.create({
        data: {
          scope: RoleScope.platform,
          code: BUILT_IN_ROLES.SUPER_ADMIN,
          name: BUILT_IN_ROLE_LABELS[BUILT_IN_ROLES.SUPER_ADMIN],
          isBuiltIn: true
        }
      });

  // 4. Create tenant roles for planner and couple
  const tenantRoles = await Promise.all(
    [BUILT_IN_ROLES.PLANNER, BUILT_IN_ROLES.COUPLE].map((roleCode) =>
      prisma.role.upsert({
        where: {
          scope_tenantId_code: {
            scope: RoleScope.tenant,
            tenantId: defaultTenant.id,
            code: roleCode
          }
        },
        update: {
          name: BUILT_IN_ROLE_LABELS[roleCode],
          isBuiltIn: true
        },
        create: {
          scope: RoleScope.tenant,
          tenantId: defaultTenant.id,
          code: roleCode,
          name: BUILT_IN_ROLE_LABELS[roleCode],
          isBuiltIn: true
        }
      })
    )
  );

  // 5. Assign permissions to roles based on BUILT_IN_ROLE_PERMISSIONS
  const allRoles = [platformRole, ...tenantRoles];
  const permissions = await prisma.permission.findMany();
  const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission]));

  for (const role of allRoles) {
    const permissionCodes = BUILT_IN_ROLE_PERMISSIONS[role.code] ?? [];
    for (const code of permissionCodes) {
      const permission = permissionByCode.get(code);
      if (!permission) {
        continue;
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }

  // 6. Create demo users
  await upsertPasswordUser({
    identifier: 'root',
    password: 'root',
    displayName: '超级管理员',
    isPlatformAdmin: true
  });

  const plannerUser = await upsertPasswordUser({
    identifier: 'admin',
    password: 'admin',
    displayName: '花间集婚礼策划'
  });

  const coupleUser = await upsertPasswordUser({
    identifier: 'user',
    password: 'user',
    displayName: '林小美 & 陈志远'
  });

  // 7. Create tenant memberships and assign roles
  const plannerMember = await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: defaultTenant.id,
        userId: plannerUser.id
      }
    },
    update: {
      displayName: '花间集婚礼策划',
      status: 'active'
    },
    create: {
      tenantId: defaultTenant.id,
      userId: plannerUser.id,
      displayName: '花间集婚礼策划'
    }
  });

  const coupleMember = await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: defaultTenant.id,
        userId: coupleUser.id
      }
    },
    update: {
      displayName: '林小美 & 陈志远',
      status: 'active'
    },
    create: {
      tenantId: defaultTenant.id,
      userId: coupleUser.id,
      displayName: '林小美 & 陈志远'
    }
  });

  const plannerRole = tenantRoles.find((role) => role.code === BUILT_IN_ROLES.PLANNER);
  const coupleRole = tenantRoles.find((role) => role.code === BUILT_IN_ROLES.COUPLE);

  if (plannerRole) {
    await prisma.memberRole.upsert({
      where: {
        memberId_roleId: {
          memberId: plannerMember.id,
          roleId: plannerRole.id
        }
      },
      update: {},
      create: {
        memberId: plannerMember.id,
        roleId: plannerRole.id
      }
    });
  }

  if (coupleRole) {
    await prisma.memberRole.upsert({
      where: {
        memberId_roleId: {
          memberId: coupleMember.id,
          roleId: coupleRole.id
        }
      },
      update: {},
      create: {
        memberId: coupleMember.id,
        roleId: coupleRole.id
      }
    });
  }

  // ── Demo Wedding Process Template ─────────────────────────────────

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
        { title: '填写婚礼需求问卷', assigneeType: 'couple', priority: 2, offsetDays: 3 },
        { title: '收集新人爱情故事与照片素材', assigneeType: 'couple', priority: 1, offsetDays: 4 },
        { title: '确认婚礼风格方向（色系/主题）', assigneeType: 'planner', priority: 3, offsetDays: 5 },
        { title: '梳理宾客名单与桌数预估', assigneeType: 'couple', priority: 2, offsetDays: 5 },
        { title: '确认整体预算分配方案', assigneeType: 'planner', priority: 2, offsetDays: 5 }
      ]},
      { name: '方案设计', description: '主视觉设计、物料清单、场地规划', tasks: [
        { title: '主视觉方案设计（LOGO/主KV）', assigneeType: 'planner', priority: 3, offsetDays: 5 },
        { title: '迎宾牌设计', assigneeType: 'planner', priority: 3, offsetDays: 6 },
        { title: '誓言卡设计', assigneeType: 'planner', priority: 2, offsetDays: 6 },
        { title: '餐卡与桌号牌设计', assigneeType: 'planner', priority: 1, offsetDays: 7 },
        { title: '座位图设计', assigneeType: 'planner', priority: 2, offsetDays: 7 },
        { title: '流程单与手卡设计', assigneeType: 'planner', priority: 1, offsetDays: 7 },
        { title: '新人确认设计方案', assigneeType: 'couple', priority: 3, offsetDays: 8 },
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
        { title: '新人确认印刷品样品', assigneeType: 'couple', priority: 3, offsetDays: 7 },
        { title: '批量印刷制作', assigneeType: 'planner', priority: 2, offsetDays: 8 },
        { title: '花艺打样确认', assigneeType: 'planner', priority: 2, offsetDays: 8 },
        { title: '道具制作/租赁清单确认', assigneeType: 'planner', priority: 2, offsetDays: 9 },
        { title: '物料到货验收与入库', assigneeType: 'planner', priority: 3, offsetDays: 10 },
        { title: '新人专属物品准备（戒枕/誓词卡）', assigneeType: 'couple', priority: 1, offsetDays: 10 }
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

  // ── Demo Material Categories & Materials ───────────────────────────────

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

  // ── M7: AI Templates ────────────────────────────────────────────────────

  // Built-in AI templates
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
      name: '新人感谢文案',
      category: 'couple' as const,
      prompt: '为新人生成婚礼结束后的感谢亲友文案。'
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

  // ── M8: Platform, Vendors, Channels ──────────────────────────────────────

  // 19. Plan packages
  const starterPlan = await prisma.planPackage.upsert({
    where: { code: 'starter' },
    update: {
      name: '入门版',
      description: '适合个人策划师起步',
      monthlyPriceCents: 9900,
      yearlyPriceCents: 99000,
      maxProjects: 10,
      maxMembers: 3,
      storageGb: 10,
      aiCreditsMonthly: 100,
      features: JSON.stringify(['crm', 'project', 'task']),
      status: 'active',
      sortOrder: 100
    },
    create: {
      code: 'starter',
      name: '入门版',
      description: '适合个人策划师起步',
      monthlyPriceCents: 9900,
      yearlyPriceCents: 99000,
      maxProjects: 10,
      maxMembers: 3,
      storageGb: 10,
      aiCreditsMonthly: 100,
      features: JSON.stringify(['crm', 'project', 'task']),
      status: 'active',
      sortOrder: 100
    }
  });

  const growthPlan = await prisma.planPackage.upsert({
    where: { code: 'growth' },
    update: {
      name: '成长版',
      description: '适合中小型工作室',
      monthlyPriceCents: 29900,
      yearlyPriceCents: 299000,
      maxProjects: 50,
      maxMembers: 10,
      storageGb: 100,
      aiCreditsMonthly: 1000,
      features: JSON.stringify(['crm', 'project', 'task', 'contract', 'finance', 'timeline']),
      status: 'active',
      sortOrder: 200
    },
    create: {
      code: 'growth',
      name: '成长版',
      description: '适合中小型工作室',
      monthlyPriceCents: 29900,
      yearlyPriceCents: 299000,
      maxProjects: 50,
      maxMembers: 10,
      storageGb: 100,
      aiCreditsMonthly: 1000,
      features: JSON.stringify(['crm', 'project', 'task', 'contract', 'finance', 'timeline']),
      status: 'active',
      sortOrder: 200
    }
  });

  const proPlan = await prisma.planPackage.upsert({
    where: { code: 'pro' },
    update: {
      name: '专业版',
      description: '适合大型婚庆公司',
      monthlyPriceCents: 59900,
      yearlyPriceCents: 599000,
      maxProjects: 200,
      maxMembers: 50,
      storageGb: 500,
      aiCreditsMonthly: 5000,
      features: JSON.stringify(['crm', 'project', 'task', 'contract', 'finance', 'timeline', 'asset', 'archive', 'ai', 'vendor', 'public_case']),
      status: 'active',
      sortOrder: 300
    },
    create: {
      code: 'pro',
      name: '专业版',
      description: '适合大型婚庆公司',
      monthlyPriceCents: 59900,
      yearlyPriceCents: 599000,
      maxProjects: 200,
      maxMembers: 50,
      storageGb: 500,
      aiCreditsMonthly: 5000,
      features: JSON.stringify(['crm', 'project', 'task', 'contract', 'finance', 'timeline', 'asset', 'archive', 'ai', 'vendor', 'public_case']),
      status: 'active',
      sortOrder: 300
    }
  });

  // 20. Tenant subscription
  await prisma.tenantSubscription.upsert({
    where: { tenantId: defaultTenant.id },
    update: {
      planPackageId: growthPlan.id,
      billingCycle: 'monthly',
      status: 'active',
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      renewsAt: new Date('2026-06-01T00:00:00.000Z')
    },
    create: {
      tenantId: defaultTenant.id,
      planPackageId: growthPlan.id,
      billingCycle: 'monthly',
      status: 'active',
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      renewsAt: new Date('2026-06-01T00:00:00.000Z')
    }
  });

  // 21. Platform settings
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

  // 22. Channel bindings
  await prisma.channelBinding.upsert({
    where: { tenantId_channel_appId: { tenantId: defaultTenant.id, channel: 'wechat_mini', appId: 'wx_wedding_demo_001' } },
    update: { name: '婚礼工作室小程序', status: 'active', config: JSON.stringify({ baseUrl: 'https://mini.wedding-demo.com' }) },
    create: {
      tenantId: defaultTenant.id,
      channel: 'wechat_mini',
      name: '婚礼工作室小程序',
      appId: 'wx_wedding_demo_001',
      status: 'active',
      config: JSON.stringify({ baseUrl: 'https://mini.wedding-demo.com' })
    }
  });

  // 23. Vendor profiles
  const demoVendors = [
    {
      id: 'demo-vendor-floral',
      name: '繁花似锦花艺工作室',
      category: 'floral',
      city: '杭州',
      contactName: '张花花',
      contactPhone: '13900001111',
      description: '专注高端婚礼花艺设计，擅长新中式、法式浪漫风格。',
      tags: JSON.stringify(['花艺', '新中式', '法式']),
      status: 'active'
    },
    {
      id: 'demo-vendor-photo',
      name: '光影记忆摄影',
      category: 'photo_video',
      city: '杭州',
      contactName: '李摄影',
      contactPhone: '13900002222',
      description: '10年婚礼摄影经验，擅长纪实风格和电影感色调。',
      tags: JSON.stringify(['摄影', '纪实', '电影感']),
      status: 'active'
    },
    {
      id: 'demo-vendor-venue',
      name: '西湖畔宴会中心',
      category: 'venue',
      city: '杭州',
      contactName: '王经理',
      contactPhone: '13900003333',
      description: '坐拥西湖一线湖景，可容纳300人宴会厅+户外草坪仪式区。',
      tags: JSON.stringify(['场地', '湖景', '草坪']),
      status: 'active'
    }
  ];

  for (const vendor of demoVendors) {
    await prisma.vendorProfile.upsert({
      where: { id: vendor.id },
      update: {
        name: vendor.name,
        category: vendor.category as any,
        city: vendor.city,
        contactName: vendor.contactName,
        contactPhone: vendor.contactPhone,
        description: vendor.description,
        tags: JSON.parse(vendor.tags),
        status: vendor.status as any
      },
      create: {
        id: vendor.id,
        tenantId: defaultTenant.id,
        name: vendor.name,
        category: vendor.category as any,
        city: vendor.city,
        contactName: vendor.contactName,
        contactPhone: vendor.contactPhone,
        description: vendor.description,
        tags: JSON.parse(vendor.tags),
        status: vendor.status as any,
        createdByUserId: plannerUser.id
      }
    });
  }

  // ── Menu Items ────────────────────────────────────────────────────────────

  // Platform-level menus (super admin)
  const platformMenuData = [
    { label: '平台', icon: 'lock', sortOrder: 0, children: [
      { label: '平台总览', href: '/admin/dashboard', icon: 'dashboard', sortOrder: 0 },
      { label: '租户管理', href: '/admin/tenants', icon: 'workspace', sortOrder: 1 },
      { label: '账号管理', href: '/admin/accounts', icon: 'user', sortOrder: 2 },
      { label: '角色管理', href: '/admin/roles', icon: 'badgeCheck', sortOrder: 3 },
      { label: '菜单管理', href: '/admin/menus', icon: 'forms', sortOrder: 4 }
    ]},
    { label: '运营', icon: 'settings', sortOrder: 1, children: [
      { label: '套餐计费', href: '/admin/billing', icon: 'billing', sortOrder: 0 },
      { label: '平台设置', href: '/admin/settings', icon: 'adjustments', sortOrder: 1 },
      { label: '渠道管理', href: '/admin/channels', icon: 'share', sortOrder: 2 }
    ]}
  ];

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

    for (const childData of parentData.children) {
      await prisma.menuItem.upsert({
        where: { id: `menu-platform-${childData.href}` },
        update: { label: childData.label, href: childData.href, icon: childData.icon, sortOrder: childData.sortOrder },
        create: {
          id: `menu-platform-${childData.href}`,
          scope: 'platform',
          parentId: parent.id,
          label: childData.label,
          href: childData.href,
          icon: childData.icon,
          sortOrder: childData.sortOrder
        }
      });
    }
  }

  // Tenant-level menus (planner)
  const tenantMenuData = [
    { label: '工作台', icon: 'dashboard', sortOrder: 0, children: [
      { label: '总览面板', href: '/studio/dashboard', icon: 'dashboard', sortOrder: 0 },
      { label: '项目管理', href: '/studio/projects', icon: 'kanban', sortOrder: 1 }
    ]},
    { label: '商务', icon: 'billing', sortOrder: 1, children: [
      { label: '意向单', href: '/studio/leads', icon: 'user', sortOrder: 0 },
      { label: '合同管理', href: '/studio/contracts', icon: 'post', sortOrder: 1 },
      { label: '物料管理', href: '/studio/materials', icon: 'product', sortOrder: 2 },
      { label: '财务概览', href: '/studio/finance', icon: 'creditCard', sortOrder: 3 },
      { label: '供应商库', href: '/studio/vendors', icon: 'phone', sortOrder: 4 },
      { label: '公开案例', href: '/studio/cases', icon: 'exclusive', sortOrder: 5 }
    ]},
    { label: '任务', icon: 'checks', sortOrder: 2, children: [
      { label: '流程模板', href: '/studio/templates', icon: 'forms', sortOrder: 0 },
      { label: '婚礼日程', href: '/studio/timeline', icon: 'calendar', sortOrder: 1 }
    ]},
    { label: '团队', icon: 'teams', sortOrder: 3, children: [
      { label: '员工管理', href: '/studio/settings', icon: 'employee', sortOrder: 0 }
    ]}
  ];

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

    for (const childData of parentData.children) {
      await prisma.menuItem.upsert({
        where: { id: `menu-tenant-${childData.href}` },
        update: { label: childData.label, href: childData.href, icon: childData.icon, sortOrder: childData.sortOrder },
        create: {
          id: `menu-tenant-${childData.href}`,
          scope: 'tenant',
          tenantId: defaultTenant.id,
          parentId: parent.id,
          label: childData.label,
          href: childData.href,
          icon: childData.icon,
          sortOrder: childData.sortOrder
        }
      });
    }
  }

  // Assign tenant menus to planner role
  if (plannerRole) {
    const tenantMenus = await prisma.menuItem.findMany({
      where: { scope: 'tenant', tenantId: defaultTenant.id }
    });
    for (const menu of tenantMenus) {
      await prisma.roleMenuItem.upsert({
        where: { roleId_menuItemId: { roleId: plannerRole.id, menuItemId: menu.id } },
        update: {},
        create: { roleId: plannerRole.id, menuItemId: menu.id }
      });
    }
  }
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
