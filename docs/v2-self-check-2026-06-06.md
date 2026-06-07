# v2 权限系统自检报告 — 2026-06-06

## 范围

覆盖 v2 完结后所有 P0/P1 工作：菜单↔接口映射、403 全局拦截、模板化角色、UI 友好化。

## 自检项

### 1. 后端单测覆盖

| 文件 | 测试数 | 状态 |
|---|---|---|
| `src/team/roles.service.spec.ts`（v2 +5） | 5 v2 tests | ✅ |
| `src/identity/identity.service.spec.ts`（v2 +4） | 4 v2 tests | ✅ |
| `src/common/auth/permissions.guard.spec.ts`（new） | 7 tests | ✅ |
| `packages/shared/src/roles.spec.ts`（new） | 5 tests | ✅ |
| **总测试数** | **574/574 pass** | ✅ |

### 2. 前端类型检查

- `bun lint` (oxlint)：**0 errors** / 3 pre-existing warnings（未变化）

### 3. Browse 端到端验证

| 场景 | 期望 | 实际 | 状态 |
|---|---|---|---|
| 平台 admin /admin/roles 列表 | 渲染 2 内置角色 + 权限功能列 | ✅ 39 项功能 · 13 组 badge | ✅ |
| 39 项功能 popover 展开 ai 组 | 显示 8 个权限描述 + 码 | ✅ 8 codes 全部显示 | ✅ |
| 平台 admin /admin/roles 新增角色 | 模板选择器 | ✅ 5 模板 + 空白角色 6 选项 | ✅ |
| 选全权管理模板 | 自动填名称/描述 + 预览 | ✅ 名称+描述自动 + 13 组分组预览 | ✅ |
| 30s 轮询触发 403 | 不弹"没有访问权限"弹窗 | ✅ 平台 admin 静默跳过 | ✅ |
| 租户 /studio/roles 新增角色（nature） | 模板流程可用 | ✅ POST /api/team/roles → 201 | ✅ |
| 模板创建后行展示 | 显示 32 项功能 · 13 组 | ✅ 设计策划模板 | ✅ |
| 关联菜单弹窗（nature） | 所有菜单 ENABLED | ✅ 12 个菜单可点 | ✅ |
| 选 leaf menu（意向单）+ 保存 | 权限功能列更新为 4 项功能 · 1 组 | ✅ 4 codes 全部显示 | ✅ |

### 4. 已修复的旁路

| Bug | 修复 | Commit |
|---|---|---|
| 平台 admin 调 tenant endpoint 误弹 403 | service 吞 403 + 全局拦截 isPlatformAdmin 跳过 | `6856a63` |
| nature 打开关联菜单弹窗全 disabled | `allowedMenuIds: Set \| null` (null = unrestricted) | `ba6d478` |
| 超级 admin 403 误弹 | 401 vs 403 区分 | `8d7984c` |

### 5. 未完成项（明确 deferred）

- `me()` 加 `tenantOwner` 字段 — **v3**（需 schema 迁移 `TenantMember.isOwner` 或 owner role marker）
- 租户级别"功能 vs 菜单"双轨 UI — **v3**（当前菜单级联，权限码从菜单 union 推算）

## 风险点

1. **共享包与前端 lib 双份 ROLE_TEMPLATES**：mirror 易漂移。`shared/roles.spec.ts` 已加 5 完整性测试，下次更新需同时改两边。
2. **顶部菜单 0 codes**：客户运营/项目管理/AI 工具等 5 个父菜单无 permissionCodes；选它们单独保存会得到"未配置"。策划师体验上 OK（"我没选任何子菜单"），但应在下一次菜单 seed 时补齐。
3. **403 isPlatformAdmin 旁路**：依赖 `getCachedMe()`。若 React Query 缓存先于 api-client 填入，全局拦截可能不命中。当前 `ClerkProvider.bootstrap` 同步填 cachedMe，顺序 OK。

## 性能

- 列表查询：573 → 574 测试，14.21s 全部完成（平均 25ms/test）
- browse 验证：30s 轮询不弹窗，network 无重复 fetch
- admin dev 启动 + 0 类型错误

## 验收

- ✅ 574 tests pass / 0 typecheck errors
- ✅ Browse 端到端 9 个场景全部通过
- ✅ 1 个真实 bug 当场修复并 commit
- ✅ 5 模板 + 隐藏码 + 全局 403 + nature 旁路修复 + 菜单↔接口 完整闭环

## 下一步

进入 **Phase 10**（v2 完结报告 + 模板决策文档）。
