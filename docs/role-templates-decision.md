# 5 套 ROLE_TEMPLATES 决策文档 — 2026-06-06

## 背景

婚庆 SaaS 行业 30-100 客户扩张期，每个新客户都要从 0 配置 5-20 个策划师角色。手工从 18 个子菜单 × 39 个权限码拼装既耗时又易错。

## 决策：B 模式 + 5 模板 + 隐藏码

### 5 模板定义

| Code | 中文名 | 权限数 | 目标角色 | 典型场景 |
|---|---|---|---|---|
| `full` | 全权管理 | 42 | 总经理/老板 | 所有功能，包括角色管理 + 系统设置 |
| `sales` | 销售策划 | 21 | 销售型策划师 | 偏 lead + contract + 客户对接 |
| `design` | 设计策划 | 32 | 设计型策划师 | 偏 scene + material + AI 生图 |
| `ops` | 运营督导 | 22 | 运营/督导 | 偏 task + timeline + 物料管理 |
| `readonly` | 只读访客 | 15 | 财务/老板助理 | 全部 .read，无 .create/.update/.delete |

### 三模式选择

参考业界 SaaS：
- **A 全平台管控**（Salesforce）：过度严，扩张期卡客户
- **B 平台开账号 + 租户开角色** ⭐ Notion / Linear / Slack：当前选
- **C 租户全自治**（Figma / GitHub Org）：需租户管理员，婚庆团队规模小不需要

### 隐藏码决策

**策划师（销售/设计/运营）永远不接触权限码。**
- 列表"权限功能"列：badge "X 项功能 · Y 组" + popover 按 group 展示描述
- 新增角色弹窗"将获得 X 项功能"按 group Accordion 聚合
- 平台 admin 仍可见码（D.10），便于技术对接
- 模板名 + 描述承担"我能干什么"语义：销售/设计/运营一眼明白

**理由**：
- 婚庆团队 5-10 人，非技术背景，码是噪声
- 客户问"老板的弟弟能不能看合同" → 答"给他销售策划角色"就够
- 平台 admin 看码是 debug + 二次开发需要

## 模板权限码对照表

### full (42)

member.*(2) + role.*(2) + lead.*(4) + project.*(4) + scene.*(4) + contract.*(2) + task.*(4) + asset.*(3) + timeline.*(2) + ai.*(8) + notification.read(1) + template.*(2) + material.*(2) + material_type.*(2)

### sales (21)

member.read + role.read + lead.*(4) + project.read + project.update + contract.*(2) + task.*(3) + timeline.read + ai.*(4) + notification.read + material_type.read + material.read

### design (32)

member.read + role.read + project.read + project.update + scene.*(4) + contract.read + task.*(3) + asset.*(3) + timeline.*(2) + ai.*(8) + notification.read + template.*(2) + material.*(2) + material_type.*(2)

### ops (22)

member.read + role.read + project.read + project.update + project.archive + scene.read + scene.update + contract.read + task.*(4) + asset.*(2) + timeline.*(2) + ai.use + ai.generation.read + notification.read + material.*(2) + material_type.read

### readonly (15)

全部 .read：member + role + lead + project + scene + contract + task + asset + timeline + ai.generation.read(2) + notification + template + material(2) + material_type

## 三路优先级（add/update 角色）

```
permissionCodes (直接传) > menuItemIds union > 不动
```

- 新增角色：前端模板路径传 `permissionCodes`，后端写入 `role.permissionCodes`
- 更新角色：模板路径覆盖；菜单路径重新 union；不动其他
- 关联菜单保存：union 重新计算，写入 `role.permissionCodes`（替换原值）
- 单一来源：`role.permissionCodes` 是权限的事实来源（v2 决策 D.9）

## 后续扩展规则

1. **新增权限码**：先在 `shared/permissions.ts` 加 metadata + group，再决定是否加到模板，最后更新 5 模板的 permissionCodes 数组。**两份**（shared + admin/lib）必须同步。
2. **新增模板**：在 5 模板外加第 6 套（如"客服"），需更新：
   - `packages/shared/src/roles.ts`（API 端）
   - `wedding-platform-admin/src/lib/role-templates.ts`（前端）
   - `roles.spec.ts` 完整性测试（如改用动态 assertion 则只测数量）
3. **v3 自服务开关**：租户可改 `tenant.selfService` 控制"是否允许从模板创建角色"，未实现。当前所有租户可用。

## 已知边界

- **顶部菜单 0 codes**：5 个父菜单（客户运营/项目管理/财务管理/物料中心/AI 工具/权限设置/平台设置）seed 时未填 permissionCodes。策划师选它们单存 → role.permissionCodes=[] → "未配置" badge 出现。UX 合理（"我没选任何子菜单"），但应在下一次菜单 seed 补齐。
- **共享包 + 前端 lib 双份**：易漂移。`shared/roles.spec.ts` 已有 5 完整性测试兜底。

## 不做什么

- **不做** 客户级（customer-level）权限：婚庆客户是 B2B，下游消费者不需要登录
- **不做** 时间窗口（"周一三五可访问"）：婚庆团队小，按团队职责分角色足够
- **不做** 资源级（"只能看自己创建的 lead"）：当前 RBAC 阶段先做功能级，资源级是 RLS 改造

## 决策时间

- 决策稿：2026-06-06 v2 自检后
- 评审人：架构组
- 实施状态：✅ 落地（v2 commit `f8532b0` + `0949b14`）
