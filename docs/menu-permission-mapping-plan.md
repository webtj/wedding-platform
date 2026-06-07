# 菜单 ↔ 接口权限 映射方案（v2）

> 状态：草案（待 review）
> 作者：codex
> 日期：2026-06-06
> 关联：[#403 权限错误处理方案 v1] [#v4.2 隐私严格化]
> 前置：v1 解决"403 体验断裂"；本方案解决"403 不再发生"

---

## 一、问题陈述

### 1.1 用户原话

> "我新增了一个 test 用户，给他分配了意向单、合同管理、物料管理的菜单，但 test 登录进去后，点击后居然报错 403"

### 1.2 根因（事实）

| 现状 | 数据 |
|---|---|
| `MenuItem` 表字段 | `id, label, href, icon, scope, parentId, sortOrder, visible, tenantId` — **无 permissionCode** |
| `/admin/menus` UI | 可编辑 label/href/icon/parent/排序/可见性 — **无 permission code 区域** |
| 自定义角色 `permissionCodes` 字段 | 后端 schema 接受；**前端 UI 从未让用户选** |
| 内置角色 `planner` | 写死 `BUILT_IN_ROLE_PERMISSIONS` 40+ 全权限（`shared/rbac.ts`） |
| **实际 @RequirePermissions 用到的 code** | **42 个**（grep 自 controllers） |
| **现有菜单项（子级）** | **18 个**（平台 7 + 租户 11） |
| **映射比例** | 1 菜单 : 1~4 permission code（视业务复杂度） |

**结果**：用户勾菜单 → 角色有菜单 → token 的 `permissions[]` 仍是空 → 任何带 `@RequirePermissions` 的接口全 403。

### 1.3 目标

- 用户认知：**"勾菜单 = 授权该页所有操作"**，**永远成立**
- 超级管理员：能在 `/admin/menus` **看到并编辑** 菜单的接口权限映射
- 高级模式：可选地直接编辑 permission code（脱离菜单）
- 0 改 controller（不动 42 个 `@RequirePermissions` 装饰器）

---

## 二、业界方案对比

| 方案 | 描述 | 例 | 优点 | 缺点 |
|---|---|---|---|---|
| **A. 1:1 强映射** | 1 菜单 = 1 code | "查看项目" = `project.read` | 简单 | 无法表达"看 + 改" |
| **B. 1:N 弱映射（推荐）** | 1 菜单 = N code，UI 多选 | "项目管理" = `project.read+create+update+archive` | 平衡 | 需维护映射表 |
| **C. 纯 RBAC** | UI 仅暴露 code | Airtable Advanced | 灵活 | 用户认知两套 |
| **D. 完全隐式** | 不暴露，按约定 | Notion Pages | 零成本 | 出问题无解 |

**选 B**（理由：粒度足够灵活，UI 简单，1 个菜单 = "模块的所有能力"，未来 1 个模块新增 controller code 只改 seed）

---

## 三、数据模型设计

### 3.1 MenuItem 新增字段

**Prisma schema 改 1 处**：

```prisma
model MenuItem {
  // ... 现有字段
  permissionCodes String[] @default([])  // 1:N
  // 索引：高频按 code 反查"哪些菜单用了这个 code"
  @@index([scope])
}
```

**`MenuItemType`（前端）新增**：

```ts
export type MenuItem = {
  id: string;
  label: string;
  href?: string | null;
  icon?: string | null;
  sortOrder: number;
  visible: boolean;
  scope: string;
  parentId?: string | null;
  children?: MenuItem[];
  permissionCodes: string[];  // ← 新增
};
```

**`CreateMenuItemInput` / `UpdateMenuItemInput`** 加 `permissionCodes: string[]`。

### 3.2 角色 permission codes 写入逻辑

**创建/更新角色时**（后端 service）：

```
输入：用户勾选的 menuIds: string[]
输出：role.permissionCodes = 合并(所有 menuItem.permissionCodes)
```

**示例**：
- 用户勾"意向单"（`/studio/leads`，`permissionCodes: ['lead.read', 'lead.create', 'lead.update', 'lead.convert']`）
- → 角色 `permissionCodes = ['lead.read', 'lead.create', 'lead.update', 'lead.convert']`
- → token `permissions` 包含这 4 个
- → 进 `/studio/leads` → 4 个接口（list/get/create/update）都通

### 3.3 角色菜单更新时的级联

**`assignMenus(roleId, menuIds)` 时**：
1. 删 `RoleMenuItem` 旧记录
2. 写新 `RoleMenuItem`
3. **重新计算** `role.permissionCodes`：
   ```ts
   const newCodes = await this.prisma.menuItem.findMany({
     where: { id: { in: menuIds } },
     select: { permissionCodes: true }
   });
   const codes = [...new Set(newCodes.flatMap(m => m.permissionCodes))];
   await this.prisma.role.update({
     where: { id: roleId },
     data: { permissionCodes: codes }
   });
   ```
4. `invalidateMe()` 触发前端 `me()` 重新拉（→ 新 token）

### 3.4 边缘情况

| 场景 | 处理 |
|---|---|
| 用户**直接编辑** `role.permissionCodes`（脱离菜单） | v1 **不暴露** UI；schema 仍接受（兼容性） |
| **删除菜单** | 不删 `role.permissionCodes`（codes 仍有效，仅失菜单入口；v2 可加"孤儿 code 清理"任务） |
| **菜单新增 code**（运营变更） | 已分配菜单的角色**自动**获得新 code（v2 加监听；v1 需用户重新勾菜单触发重算） |
| **平台 admin 角色** | 走 `BUILT_IN_ROLE_PERMISSIONS`，**不**走菜单映射（v4 隐私严格化） |
| **内置角色 `planner`** | 走 `BUILT_IN_ROLE_PERMISSIONS` 写死 40+ 全权限，**不**走菜单映射 |

---

## 四、菜单 ↔ 权限码 初始映射（基于现有 18 个子菜单 + 42 个 code）

### 4.1 平台菜单（7 个子菜单）

| 菜单 label | href | 权限码（建议） |
|---|---|---|
| 租户管理 | `/admin/tenants` | `tenant.read, tenant.manage` |
| 账号管理 | `/admin/accounts` | `member.read, member.manage` |
| 角色管理 | `/admin/roles` | `role.read, role.manage` |
| 菜单管理 | `/admin/menus` | （无 — 元数据管理，平台 admin 直通） |
| 套餐计费 | `/admin/billing` | （无 — 平台 admin 直通） |
| 通用设置 | `/admin/settings` | `platform.setting.read, platform.setting.manage` |
| 素材管理（平台） | `/admin/material-types` | `material_type.read, material_type.manage` |

### 4.2 租户菜单（11 个子菜单）

| 菜单 label | href | 权限码（建议） |
|---|---|---|
| 总览面板 | `/studio/overview` | `notification.read` (顶栏通知 + dashboard) |
| 项目管理 | `/studio/projects` | `project.read, project.create, project.update, project.archive, scene.read, scene.create, scene.update, scene.delete` |
| 意向单 | `/studio/leads` | `lead.read, lead.create, lead.update, lead.convert` |
| 合同管理 | `/studio/contracts` | `contract.read, contract.manage` |
| 物料管理 | `/studio/materials` | `material.read, material.manage` |
| AI 工作台 | `/studio/ai-workbench` | `ai.use, ai.generate, ai.generation.read, ai.generation.bookmark, ai.generation.series` |
| 生图模板 | `/studio/ai-workbench/templates` | `template.read, template.manage` |
| 素材管理（租户） | `/studio/material-types` | `material_type.read, material_type.manage` |
| 流程模板 | `/studio/templates` | `process_template.*` (注：目前没专用 code，临时挂 `task.read`) ⚠️ |
| 婚礼日程 | `/studio/timeline` | `timeline.read, timeline.manage` |
| 账号管理 | `/studio/accounts` | `member.read, member.manage` |
| 角色管理 | `/studio/roles` | `role.read, role.manage` |

> ⚠️ 标 ⚠️ 的需要 review（`process_template.*` 还没在 PERMISSIONS 常量里；先挂 `task.read` 兜底）

### 4.3 seed 改动

`prisma/seed.ts` 的 `platformMenuData` / `tenantMenuData` 加 `permissionCodes: []` 字段；新建 seed 时填入。

**Migration** 字段加完，已有数据 `permissionCodes: []`（empty），用户**首次**编辑菜单时再填。

---

## 五、前端 UI 设计

### 5.1 `/admin/menus` 编辑弹窗改造

**当前弹窗字段**：label / href / icon / parent / sortOrder / visible
**新增字段**：`权限码`（多选 chip 区）

UI 草图：

```
┌─ 编辑菜单：项目管理 ─────────────────────────┐
│                                              │
│  标签       [项目管理                  ]     │
│  链接       [/studio/projects         ]      │
│  图标       [📁 kanban ▼]                    │
│  父菜单     [商务 ▼]                          │
│  排序       [1]    可见  [✓]                  │
│                                              │
│  ── 接口权限 ── 8/8 已选           [清空]    │
│  勾选越多，能做的操作越多                    │
│                                              │
│  ☑ project.read       查看项目               │
│  ☑ project.create     新建项目               │
│  ☑ project.update     编辑项目               │
│  ☑ project.archive    归档项目               │
│  ☑ scene.read         查看场景               │
│  ☑ scene.create       新建场景               │
│  ☑ scene.update       编辑场景               │
│  ☑ scene.delete       删除场景               │
│                                              │
│  [取消]                       [保存]         │
└──────────────────────────────────────────────┘
```

**特性**：
- 顶部统计 `已选 N/总数` + 搜索框（>10 时显示）
- 按 prefix 分组折叠（`project.*` / `scene.*` / `ai.*`）
- 全选/清空按钮
- tooltip 解释："勾选 = 角色勾此菜单后自动获得这些权限"

### 5.2 `/admin/menus` 列表展示

**当前表格列**：label / href / 父菜单 / 排序 / 可见 / 操作
**新增列**：`权限码` — 显示 `8 项权限` chip，点击展开 popup 看具体 code 列表

### 5.3 `/admin/roles` 弹窗文案调整（治标的延续）

弹窗标题：保持 `取消关联菜单 — {roleName}`（v1 弹窗）
弹窗描述：从
> "默认显示该角色当前已关联的全部菜单。取消勾选即可解除关联，保存后生效。"

改为：
> "勾选菜单即授权该页所有操作。保存后系统自动派发对应接口权限。"

**平台 admin 弹窗**：保持全可选（v1.1 修复 + 全菜单显示）

### 5.4 `/admin/permissions` 新增页面（可选 v2）

列出所有 PERMISSIONS 码 + "被哪些菜单引用"反查表。v1 不做。

---

## 六、后端改动清单

### 6.1 Prisma schema

```prisma
// prisma/schema.prisma
model MenuItem {
  // ... 现有字段 ...
  permissionCodes String[] @default([])
}
```

跑：`pnpm prisma:migrate dev --name menu_permission_codes`

### 6.2 `@wedding/shared` types

`CreateMenuItemInput` / `UpdateMenuItemInput` 加 `permissionCodes?: string[]`。

### 6.3 `SuperMenusService`

- `create()` / `update()` 接受 `permissionCodes`
- **新增** `getReferencedBy(code: string): MenuItem[]` — 查哪些菜单用了这个 code（v2 用）

### 6.4 `SuperRolesService` / `TeamRolesService`

- `assignMenus(roleId, menuIds)`：**重新计算** `role.permissionCodes`
- 不影响 `createRole(input.permissionCodes)` 路径（schema 兼容）

### 6.5 `TeamMenusService`（租户菜单，如存在）

同上 pattern。**先看代码是否存在**（v4 已部分清理）— 假设存在，需要同步。

### 6.6 Permission codes 工具函数

`packages/shared/src/permissions.ts` 已有 `ALL_PERMISSION_CODES` 常量。**新增** `PERMISSION_METADATA`：

```ts
export const PERMISSION_METADATA: Record<PermissionCode, {
  group: string;       // 'project' | 'lead' | 'contract' | ...
  description: string; // '查看项目' | '新建项目' | ...
}> = {
  'project.read': { group: 'project', description: '查看项目' },
  'project.create': { group: 'project', description: '新建项目' },
  // ... 全 42 个填上
};
```

后端 seed 用得到；前端 `/admin/menus` 弹窗用得到。

---

## 七、前端改动清单

### 7.1 `features/menus/api/types.ts` — `MenuItem` 加 `permissionCodes`

### 7.2 `features/menus/api/service.ts` — create/update 传 `permissionCodes`

### 7.3 `features/menus/components/menus-view.tsx` — 编辑弹窗加"接口权限"区

**实现要点**：
- 多选 component 用 shadcn `Command` + `Checkbox` 自实现
- 数据从 `useAllPermissionCodes()` 拉
- 显示"已选 N/42"
- 搜索过滤

### 7.4 `features/menus/components/menus-view.tsx` — 列表"权限码"列

### 7.5 `features/roles/components/roles-table.tsx` — 弹窗描述文案调整

### 7.6 弹窗 UI 增强（菜单选择区域）

不变（菜单勾选 UX 已 ok）

---

## 八、与"403 错误处理 v1"的关系

| 维度 | v1 (403 处理) | v2 (菜单↔权限) |
|---|---|---|
| 解决问题 | 403 体验断裂 | 403 不再发生 |
| 工作量 | 1 天 | 2-3 天 |
| 改动文件 | 8 (后端 2 + 前端 6) | 10+ (后端 4 + 前端 6 + shared 1 + seed 1) |
| 用户感知 | "哦原来是这个权限" | "勾菜单 = 一切正常" |
| 是否需要 v1 | — | **可选**（v2 落地后 v1 价值降低） |

**建议路径**：
1. **本方案 v2 落地后，v1 仍保留**（作为兜底：菜单真没勾的 case）
2. 或者：**只做 v2**（如果用户接受"建菜单时必须填 code"的强约束）

---

## 九、决策点（待你拍板）

1. **D.1** — 1:N 映射用 Prisma `String[]` 还是关联表 `MenuItemPermissionCode`？
   - 建议 `String[]`（简单；菜单归属清晰；无需 join；无 N+1）

2. **D.2** — `PERMISSION_METADATA.group`（分组维度）按 `*` 前的 prefix 算（`project.read` → `project`）还是手工指定？
   - 建议自动（一致；维护简单）

3. **D.3** — `/admin/menus` 编辑弹窗**强制必填** `permissionCodes`（0 权限不让保存）还是**可选**？
   - 建议**可选**（v1 兼容；菜单管理是元数据，0 权限的菜单虽然奇怪但合法）

4. **D.4** — 角色 `assignMenus` 重算 `permissionCodes` 时，**清空**还是**合并**已有的 code？
   - 建议**完全重算**（= 当前菜单 codes 的并集；用户认知清晰："勾的菜单决定所有权限"）
   - 替代：合并（兼容"高级模式"；UI 暂时没暴露，等 v3）

5. **D.5** — 平台 admin 角色（`isPlatformAdmin: true`）的权限码**自动包含**所有 platform.* 吗？
   - 建议**是**（现状已这样：`PermissionsGuard` 平台 admin bypass）

6. **D.6** — seed 重跑时 `permissionCodes` 怎么处理？
   - 建议**幂等**（upsert 时 merge 数组：保留 DB 已有 + seed 新加）

---

## 十、实施计划

### Phase 1（schema + seed + 后端，1 天）

| # | 任务 | 文件 | 工作量 |
|---|---|---|---|
| 1.1 | Prisma 加 `permissionCodes` 字段 + migration | `schema.prisma` | 0.5h |
| 1.2 | `PERMISSION_METADATA` 全 42 个填写 | `packages/shared/src/permissions.ts` | 1h |
| 1.3 | `CreateMenuItemInput` / `UpdateMenuItemInput` 加字段 | `packages/shared/src/business.ts` | 0.5h |
| 1.4 | `SuperMenusService.create/update` 接受字段 | `super-menus.service.ts` | 0.5h |
| 1.5 | `assignMenus` 重算 `role.permissionCodes` | `super-roles.service.ts` + `team-roles.service.ts` | 1h |
| 1.6 | seed 填初始映射（4.1 + 4.2 表） | `prisma/seed.ts` | 1h |
| 1.7 | `pnpm prisma:migrate` + 重跑 seed | — | 0.5h |

### Phase 2（前端，1 天）

| # | 任务 | 文件 | 工作量 |
|---|---|---|---|
| 2.1 | `MenuItem` 类型加 `permissionCodes` | `features/menus/api/types.ts` | 0.5h |
| 2.2 | `useAllPermissionCodes()` hook | `features/permissions/api/` (新) | 1h |
| 2.3 | 弹窗加"接口权限"多选区 | `features/menus/components/menus-view.tsx` | 3h |
| 2.4 | 列表"权限码"列 + popup 详情 | 同上 | 1h |
| 2.5 | `/admin/roles` 弹窗文案调整 | `features/roles/components/roles-table.tsx` | 0.5h |
| 2.6 | 缓存失效：菜单 mutation → 角色 account 失效 | `features/menus/api/queries.ts` | 0.5h |

### Phase 3（验证，半天）

| # | 任务 | 工作量 |
|---|---|---|
| 3.1 | browse E2E：test 用户进 `/studio/leads` 不再 403 | 1h |
| 3.2 | browse：删菜单 → 角色 `permissionCodes` 自动重算 | 1h |
| 3.3 | 单元测：assignMenus 重算逻辑 | 1h |
| 3.4 | lint + typecheck + 558 测 | 0.5h |

---

## 十一、验收清单

- [ ] root 在 `/admin/menus` 编辑"项目管理"看到 8 个 code 多选区
- [ ] 勾"意向单"菜单 → 进 `/studio/leads` → 4 个接口全通
- [ ] test 用户登录 → 不再 403
- [ ] 删"意向单"菜单关联 → 角色 `permissionCodes` 自动少 4 个
- [ ] planner 内置角色不受影响（仍走 BUILT_IN_ROLE_PERMISSIONS）
- [ ] 平台 admin 角色不受影响
- [ ] 缓存链路：菜单改 → 角色 account filter 失效（v4.2 已修路径，加 1 处）
- [ ] PERMISSION_METADATA 全 42 个填好
- [ ] seed 幂等（重跑不丢数据）
- [ ] lint 0 错 / typecheck 0 错 / 测不退化

---

## 附录：相关现有文件

| 路径 | 用途 |
|---|---|
| `prisma/schema.prisma:MenuItem` | 改 1 个字段 |
| `packages/shared/src/permissions.ts:1-50` | 加 `PERMISSION_METADATA` |
| `packages/shared/src/business.ts:233-244` | `createTenantRoleSchema` 加 `permissionCodes`（**已有**） |
| `prisma/seed.ts:603-712` | 填 `permissionCodes` 初始值 |
| `src/features/menus/api/types.ts:1-11` | `MenuItem` 加字段 |
| `src/features/menus/components/menus-view.tsx` | 编辑弹窗改造 |
| `src/features/roles/components/roles-table.tsx` | 弹窗文案 |
| `wedding-platform-api/src/super-admin/super-roles.service.ts:65-76` | `assignMenus` 改 |
| `wedding-platform-api/src/team/roles.service.ts`（如存在） | 同上 pattern |
