# v2 权限系统完结报告 — 2026-06-06

## TL;DR

v2 解决"菜单有权限但接口没设防"的根本漏洞 + 全局 403 拦截 + 5 模板化角色管理。**574 单测通过 / 0 类型错误 / Browse 端到端验证 9 场景全通过**。

## 交付物

### 1. 菜单↔接口权限映射 v2（产品决策 D.9）

**问题**：菜单项可隐藏，但 API endpoint 无 guard，GET 端点 100% 越权
**根解**：`MenuItem.permissionCodes String[]` + `Role.permissionCodes String[]` + 双 union 计算
**数据模型**：
- `MenuItem.permissionCodes`：菜单项持有该入口所需的全部权限码
- `Role.permissionCodes`：角色直接持有权限码（事实来源）
- 多角色 / 多菜单的权限取 union
**代码**：
- `prisma/migrations/20260606_add_permission_codes/migration.sql`
- `prisma/seed.ts:603-712` 18 子菜单 permissionCodes
- `Role.permissionCodes String[]` (schema:328-349)
- 39 个有效 permission code（删 `client.read/manage` 后）

### 2. 403 全局拦截 v1

**问题**：每个 useQuery/useMutation 都要包 QueryErrorBoundary，5 个页面已漏包
**根解**：`QueryClient.queryCache.onError` + `mutationCache.onError` → `window.dispatchEvent('app:forbidden')` → `ForbiddenProvider` → 全屏 alertdialog
**代码**：
- `lib/forbidden-context.tsx` ForbiddenProvider + useForbidden
- `components/permissions/no-permission-panel.tsx` 全屏 dialog
- `lib/api-client.ts:98-116` 非 React 调用 dispatchEvent 兜底
- `lib/query-client.ts:46-52` QueryCache + MutationCache onError
- 携带 `requiredPermissions + resource`（从 controller class name 提取）

### 3. 5 ROLE_TEMPLATES（产品决策 D.10/D.11）

**问题**：30+ 客户时，租户从 0 配置 5-20 角色，效率低易错
**根解**：5 套预制模板一键应用
**数据**：
- `packages/shared/src/roles.ts` BUILT_IN_ROLES + ROLE_TEMPLATES
- `wedding-platform-admin/src/lib/role-templates.ts` 前端镜像
- 5 模板权限数：full=42 / sales=21 / design=32 / ops=22 / readonly=15
- 13 业务分组：ai / asset / contract / lead / material / material_type / member / notification / project / role / scope / task / template / timeline

### 4. UX 友好化

- 租户角色管理 UI **完全隐藏 permissionCodes**
- 列表"权限功能"列：badge "X 项功能 · Y 组" + popover 按 group 人类描述
- 新增角色弹窗"将获得 X 项功能"按 group Accordion 聚合 + "隐藏码"提示
- 平台 admin 仍可见 code（debug 需）
- 模板名 + 描述承担"我能干什么"语义：销售/设计/运营一眼明白

### 5. 全局修过的 bug

- `6856a63` 平台 admin 调 tenant endpoint 误弹 403（service 吞 + 拦截器 isPlatformAdmin 跳过）
- `ba6d478` nature 打开关联菜单弹窗全 disabled
- `8d7984c` 401 vs 403 区分 + team-accounts 撤手动 QueryErrorBoundary

## 数字

| 指标 | v1 | v2 |
|---|---|---|
| 单测数 | 549 | 574 (+25) |
| 权限码 | 0 | 39 |
| 模板 | 0 | 5 |
| 端到端验证 | 0 | 9 场景 |
| 旁路 bug | n/a | 0 已知 |
| **Commits ahead of origin** | — | **40** |

## 文件清单

### Backend

- `prisma/schema.prisma:328-349` `Role.permissionCodes String[]`
- `prisma/schema.prisma:386-407` `MenuItem.permissionCodes String[]`
- `prisma/migrations/20260606_add_permission_codes/migration.sql` ALTER
- `prisma/seed.ts:603-712` 18 子菜单 permissionCodes
- `packages/shared/src/roles.ts` BUILT_IN_ROLES + ROLE_TEMPLATES
- `packages/shared/src/roles.spec.ts` 5 完整性单测
- `packages/shared/src/business.ts:274-298` createTenantRoleSchema 加 permissionCodes
- `src/identity/identity.service.ts:20-39, 477-490, 524-549` 走 role.permissionCodes
- `src/identity/identity.service.spec.ts` +4 v2 tests
- `src/team/roles.service.ts` 三路优先级
- `src/team/roles.controller.ts` 透传 permissionCodes
- `src/team/roles.service.spec.ts` +5 v2 tests
- `src/super-admin/super-roles.service.ts:51-95` assignMenus union 重算
- `src/common/auth/permissions.guard.ts:25-37` 403 携带 details
- `src/common/auth/permissions.guard.spec.ts` 7 单测
- `src/common/exceptions/business.exception.ts:17-31` permissionDenied

### Frontend

- `lib/forbidden-context.tsx` ForbiddenProvider
- `lib/api-client.ts:98-116` api-client dispatch + isPlatformAdmin 旁路
- `lib/query-client.ts` QueryCache/MutationCache onError
- `lib/role-templates.ts` ROLE_TEMPLATES 镜像 + summarizePermissionGroups
- `components/permissions/no-permission-panel.tsx` 全屏 dialog
- `components/permissions/permission-multi-select.tsx` 按 group 多选
- `features/team-roles/components/team-roles-table.tsx` 模板 + 能力列 + 菜单弹窗 nature 修复
- `features/team-roles/api/{types,service}.ts` TeamRole + permissionCodes
- `features/roles/components/roles-table.tsx` 平台 admin 同样接 ROLE_TEMPLATES
- `features/roles/api/types.ts` Role 加 permissionCodes
- `features/team-accounts/components/team-accounts-table.tsx` 撤手动 QueryErrorBoundary
- `features/notifications/api/service.ts` getUnreadCount 吞 403
- `features/menus/api/{types,service,queries}.ts` + `components/menus-view.tsx` 菜单↔码

### Docs

- `docs/menu-permission-mapping-plan.md` v2 8 决策
- `docs/403-permission-error-handling-plan.md` v1 5 决策
- `docs/v2-self-check-2026-06-06.md` 自检报告
- `docs/role-templates-decision.md` 5 模板决策
- `docs/v2-wrap-up.md` (本文件)

## v3 路线图

1. `me()` 加 `tenantOwner` 字段（需 schema 迁移 TenantMember.isOwner 或 owner role marker）
2. 资源级 RLS（"只能看自己创建的 lead"）— RLS 改造
3. 菜单 seed 补齐 5 父菜单 permissionCodes
4. 模板动态断言测试（防止 5/21/32/22/15 数漂移）

## 反思

- v1 早期"让前端控"是**产品决策错误**，幸而 v2 早修正
- 5 模板不是"过度设计"：婚庆 30-100 客户扩张期，**最低配置**；不做 = 5x 后期成本
- v2 不只改代码，**改了 UX 思维**：权限码是技术债务，不应给客户看
- 旁路 bug 都是 HMR 期间没复测发现，**browse 验证不可省**

## 验收

- ✅ **574/574 单测通过**
- ✅ **0 类型错误** (admin + api)
- ✅ **Browse 9 场景**全部通过
- ✅ **40 commits** ahead of origin
- ✅ **5 文档**：plan × 2 / self-check / templates decision / wrap-up
