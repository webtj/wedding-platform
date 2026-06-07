# 403 权限错误处理方案（v1）

> 状态：草案（待 review）
> 作者：codex
> 日期：2026-06-06
> 关联：[#v4.2 隐私严格化] [#缓存失效] [#角色-菜单-权限映射]
> 根因：当前用户给 test 角色分配了"意向单/合同管理/物料管理"菜单，但进 `/studio/leads` → `GET /api/leads` 收到 403，**没有任何引导**，体验断裂

---

## 一、问题陈述

### 1.1 当前现状（已踩坑的事实）

**事实 1：菜单 ≠ 权限（断头路）**
- 用户在 `/studio/roles` 勾菜单 → 角色有菜单
- 但用户进页 → 调 `GET /api/leads` → 后端 `PermissionsGuard` 校验 `permissions[]`（JWT 里的 claim）→ token 是登录时基于 `BUILT_IN_ROLE_PERMISSIONS` 或角色 `permissionCodes` 发的
- **自定义角色创建时 UI 没让用户选 permission code** → `role.permissionCodes = []` → token `permissions: []` → 任何带 `@RequirePermissions` 的接口全 403
- 内置角色 `planner` 走 `BUILT_IN_ROLE_PERMISSIONS` 写死 40+ 权限，所以**默认能通**

**事实 2：403 体验断裂**
- `api-client.ts:98-104` 收到 403 → `toast.error("权限不足，请联系管理员")` → **就完了**
- `useQuery` 失败时，组件 `if (error)` 渲染"加载失败"占位，**没说哪个 code 缺、找谁、怎么办**
- **没有"申请权限"入口**（Slack/Notion/Lark 都有"Request access"按钮）
- **没有路由级守卫**（进了页发现接口全 403，空白页 + toast）
- **后端 403 body 不带 `requiredPermissions` 详情**（`BusinessException.permissionDenied()` 不传 details）

**事实 3：用户分不清"我配置错了" vs "我权限不够"**
- test 用户登录 → 进 `/studio/leads` → 看到空白表格
- 用户 1："菜单没勾？"（已勾）
- 用户 2："接口调不通？"
- 用户 3："找谁？超级管理员？租户管理员？"

### 1.2 用户原话提炼的需求

> "如果某个页面中有一个接口的没有权限，用户接口报403错误了，那页面上如何统一弹窗展示，引导去找管理员。"
> "我觉得这一套挺重要的"

**核心需求**：
1. **统一**：所有 403 用**同一套**机制展示（不是每个组件自己写）
2. **明确**：告诉用户**缺什么**（不只是"权限不足"）
3. **可执行**：给**下一步**（找谁 / 申请 / 切角色）
4. **不打扰**：正常用户**永远不弹**（区分：登录成功、按钮正常点击 vs 进页失败）

---

## 二、业界调研：4 款产品的 403 设计

### 2.1 横向对比表

| 产品 | 触发场景 | 弹窗形态 | 含详情 | 申请入口 | 找管理员入口 |
|---|---|---|---|---|---|
| **Notion** | 进受限 page | 全屏 access denied 页 | ✅ 解释"为什么不能看" | ❌ 无 | ❌ 无（PM 主动分享） |
| **GitHub** | 调 API/clone 私有 repo | Toast + 文档链接 | ✅ "需要 admin 权限" | ❌ 无 | ✅ "Contact admin" 链接 |
| **Slack** | 发消息到受限频道 | Inline 红色 banner | ✅ "Channel is private" | ❌ 无 | ❌ 无 |
| **Airtable** | 改 schema 缺权限 | Modal 弹窗 | ✅ 列出"需要 X 权限" | ❌ 无 | ✅ "Ask workspace owner" |
| **飞书/Lark** | 文档无权限 | 半屏 dialog | ✅ 显示"管理员：xxx" | ✅ 申请按钮 | ✅ 显示谁有权限 |
| **企业微信** | 应用无权限 | 弹窗 + 二维码 | ✅ "联系 IT 管理员" | ❌ 无 | ✅ 联系 IT 入口 |

**共识模式**（跨 4-6 款产品的共性）：
1. **明确"什么权限"** — 至少告诉用户"缺 X 权限"（不是"权限不足"）
2. **明确"找谁"** — 显示管理员的姓名/邮箱/角色
3. **提供"申请"或"找管理员"中至少一种**
4. **不打扰主流程** — 正常用户 0 弹窗；只在**首次/页面级**拦截

### 2.2 适配本项目的设计选择

本项目是 **B 端 SaaS（婚礼行业）**，不是 C 端：
- 租户用户**很少**会主动申请权限（不像 Notion 共享场景）
- 90% 场景：**用户没权限 → 找本租户的 owner/admin 改**（小公司群里喊一声）
- 10% 场景：跨租户/平台 admin

**所以本项目应该**：
- ✅ 显示**缺什么**（必须，否则用户不知道怎么改）
- ✅ 显示**找谁**（租户 admin 的姓名，必要时邮箱）
- ⚠️ "申请权限"按钮 = **可选项**（v1 可以是占位 TODO，v2 加 IM/邮件通知）
- ✅ 页面级 + Toast 双层（首次进页 / 后续操作区分）

---

## 三、本项目方案设计

### 3.1 总体架构：四层防御

```
[路由级]  →  [页面级]  →  [操作级]  →  [组件级]
    ↓            ↓            ↓            ↓
  AuthGuard   QueryGuard   useMutation  inline 错误
  已有 v4     新增         已有 toast   错误状态
```

| 层 | 触发 | 当前行为 | 目标行为 |
|---|---|---|---|
| **L1 路由级** | 进页前（无 tenant / 跨模式） | 跳走（v4 已有） | 保持 |
| **L2 页面级** | 首个 query 失败（403） | Toast + 空白 | **统一 `<NoPermissionPanel>` 全屏组件** + "申请/找管理员"按钮 |
| **L3 操作级** | mutation 失败（403） | Toast | 区分：路由级 403 → 弹"会话失效"toast；接口级 403 → toast 增强（带 code 详情） |
| **L4 组件级** | 局部 query 失败（部分 403） | 组件自己渲染"加载失败" | 加 query 错误上下文 → 显示小 banner + 隐藏受影响区域 |

### 3.2 后端改动：403 body 携带详情

**目标**：`BusinessException.permissionDenied()` 传 `details: { requiredPermissions, userPermissions, resource? }`

**改动**（1 个文件）：

```ts
// common/exceptions/business.exception.ts
static permissionDenied(details?: {
  requiredPermissions?: PermissionCode[];
  resource?: string;
}) {
  return new BusinessException(
    'PERMISSION_DENIED',
    '权限不足，请联系管理员',
    HttpStatus.FORBIDDEN,
    details
  );
}
```

**`PermissionsGuard` 传 details**（1 个文件）：

```ts
// common/auth/permissions.guard.ts
if (!ok) {
  throw BusinessException.permissionDenied({
    requiredPermissions: required,
    resource: context.getClass().name  // 'LeadsController' 等
  });
}
```

**后端响应体**：
```json
{
  "code": "PERMISSION_DENIED",
  "message": "权限不足，请联系管理员",
  "statusCode": 403,
  "details": {
    "requiredPermissions": ["lead.read"],
    "resource": "LeadsController"
  }
}
```

### 3.3 前端基建：4 个新文件

#### A. `src/lib/auth/forbidden-context.tsx` — 403 状态总线

```tsx
type ForbiddenEvent = {
  scope: 'page' | 'action';
  requiredPermissions?: string[];
  resource?: string;
  at: number;  // timestamp
};

const Ctx = createContext<{
  pending: ForbiddenEvent | null;
  report: (e: ForbiddenEvent) => void;
  clear: () => void;
}>(...);
```

**职责**：把"403 信号"集中管理，**所有 403 走这一个 context**。

#### B. `src/components/permissions/no-permission-panel.tsx` — 全屏无权限页

```tsx
<NoPermissionPanel
  required={['lead.read']}
  resource="意向单列表"
  adminName="李四"          // 来自 me().tenant.members.find(role='owner')
  onRequestAccess={() => ...}  // v1 弹 toast"已通知管理员"; v2 调 API
  onBack={() => router.back()}
/>
```

UI 草图（按"清晰可执行"原则设计）：

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              🔒 暂无访问权限                     │
│                                                 │
│  页面「意向单」需要以下权限：                    │
│                                                 │
│  • lead.read (查看意向单)                       │
│  • lead.create (新建意向单)                     │
│                                                 │
│  管理员：李四（owner@yourcompany.com）          │
│  复制联系方式 →                                  │
│                                                 │
│  [申请权限]              [返回上一页]            │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### C. `src/components/permissions/forbidden-toast.tsx` — 操作级 toast 增强

普通的 sonner `toast.error` 不够 → 写一个 wrapper：

```tsx
toast.error('权限不足', {
  description: '需要 lead.update 权限',
  action: { label: '申请权限', onClick: ... }
});
```

#### D. `src/hooks/use-tenant-admin.ts` — 查找本租户 owner

```ts
function useTenantAdmin() {
  const { activeWorkspaceId } = useAuth();
  return useQuery({
    queryKey: ['tenant-admin', activeWorkspaceId],
    queryFn: () => apiClient<MemberInfo[]>('/team/members?role=owner'),
    enabled: !!activeWorkspaceId && !isPlatformAdmin,
    staleTime: 5 * 60 * 1000  // ⚠️ 但 v4.2 全 0 了，这里需要小例外
  });
}
```

> ⚠️ 注：v4.2 决定全局 staleTime=0。tenant-admin 是稳定数据，**建议这里**用 `gcTime` 长一些（5min 后清理），但**每次进面板都重新拉**——可接受。

### 3.4 接入点：6 个文件改动

| 接入点 | 文件 | 改动 |
|---|---|---|
| 路由级 | 现有 `AuthGuard` 不动 | — |
| 页面级 | 新 `<QueryErrorBoundary>` 包 page | catch 首个 403 → 渲染 `<NoPermissionPanel>` |
| 操作级 | `api-client.ts` 检测 `error.code === 'PERMISSION_DENIED'` → 调 `forbiddenCtx.report()` | 走 `forbidden-toast` 而非普通 toast |
| 组件级 | 局部 `useQuery` 失败 → 渲染小 banner | 新 `<QueryErrorBanner>` |
| 角色关联 | `/admin/menus` 加"接口权限"区（与上一轮方案合并） | 见 [附录 A] |
| 全局 | 在 `app/layout.tsx` 挂 `<ForbiddenProvider>` | 让任何深层组件可触发 |

### 3.5 完整调用链（一个 user journey）

**场景**：test 用户登录 → 菜单有"意向单"但 permission code 缺 → 进 `/studio/leads`

```
1. 进路由
   AuthGuard (v4)  ✓ 放行（有 tenant context）
2. 页面挂载
   <QueryErrorBoundary> 包裹
3. useQuery 调 GET /api/leads
   apiClient → fetch
4. 后端 403 + details
5. api-client 检测 code === 'PERMISSION_DENIED'
   → forbiddenCtx.report({ scope: 'page', required: ['lead.read'], resource: 'LeadsController' })
   → throw ApiError
6. QueryErrorBoundary 捕获 + 判断是 403
   → 渲染 <NoPermissionPanel required={...} adminName={...} />
7. 用户看到：
   - 标题：🔒 暂无访问权限
   - 详情：需要 lead.read
   - 管理员：李四
   - 按钮：[申请权限] [返回上一页]
8. 用户点"申请权限"
   → v1: toast.info("已通知管理员")
   → v2: POST /api/team/access-requests → 通知 owner
9. 用户点"返回上一页"
   → router.back()
```

---

## 四、UX 详细规范

### 4.1 页面级（首选方案：全屏面板，不是 Modal）

| 决策 | 选 A | 选 B | ✅ 选 C |
|---|---|---|---|
| 弹窗 vs 全屏 | Modal（占屏 50%） | 全屏（占满） | **全屏**（用户不能"绕过"，避免误点） |
| 弹 vs 不弹 | 第一个 query 失败就弹 | 收集所有后一次性 | **单 query 即弹**（快、不让用户等） |
| 详情粒度 | "权限不足" | "缺 X 权限" | **"缺 X 权限 + 中文解释"** |
| 申请入口 | 无 | 申请按钮（v2） | **按钮占位 v1 提示已通知，v2 真发请求** |
| 找谁 | 无 | 找管理员 | **"管理员：xxx（邮箱）"** |
| 跨租户/平台 | 不区分 | 区分 | **平台 admin 角色显示"平台管理员"占位** |

### 4.2 操作级（toast 增强）

| 场景 | 当前 | 目标 |
|---|---|---|
| 用户点"删除" → 403 | "权限不足，请联系管理员" | "删除失败：需要 lead.delete 权限" + 复制按钮 |
| 跳转被拦截 | 跳走（v4） | 保持 |
| 路由进入失败 | Toast 一次 | **不要重复弹**（每次进同一页只弹 1 次） |

### 4.3 文案规范

| 错误码 | 用户文案 | 备用 |
|---|---|---|
| `PERMISSION_DENIED` (page) | "暂无访问权限" | "该页面需要更高级别权限" |
| `PERMISSION_DENIED` (action) | "操作权限不足" | "当前操作需要 [code] 权限" |
| `AUTH_TOKEN_EXPIRED` | "登录已过期" | "请重新登录" |
| `RESOURCE_NOT_FOUND` | "资源不存在或已被删除" | — |

**统一原则**：
- ✅ 告诉用户**结果**（不能做），不只说**原因**（权限不足）
- ✅ 告诉用户**做什么**（找管理员/重新登录）
- ❌ 不说技术细节（"JWT 校验失败"）

---

## 五、实施计划（推荐顺序）

### Phase 1（必须，1 天）

| # | 任务 | 文件 | 工作量 |
|---|---|---|---|
| 1.1 | 后端 403 body 携带 `requiredPermissions` | `business.exception.ts` + `permissions.guard.ts` | 0.5h |
| 1.2 | 前端 `ApiError.details` 类型扩展 | `api-client.ts` | 0.5h |
| 1.3 | 新 `<ForbiddenProvider>` + context | 新文件 | 1h |
| 1.4 | 新 `<NoPermissionPanel>` 全屏组件 | 新文件 | 2h |
| 1.5 | 新 `<QueryErrorBoundary>` 包装 page | 新文件 + 接入 page | 2h |
| 1.6 | `api-client.ts` 403 走 forbiddenCtx | 改 1 处 | 0.5h |
| 1.7 | browse 实测 3 个场景 | — | 1h |

### Phase 2（重要，半天）

| # | 任务 | 文件 | 工作量 |
|---|---|---|---|
| 2.1 | `<ForbiddenToast>` 操作级 toast 增强 | 新文件 + `api-client.ts` 改 | 1h |
| 2.2 | `<QueryErrorBanner>` 局部组件级错误 | 新文件 | 1h |
| 2.3 | `useTenantAdmin` hook | 新文件 | 1h |
| 2.4 | 接入若干高频页（accounts, roles, leads） | 改 3 个 page | 1h |

### Phase 3（v2，"申请权限"功能）

- 后端 `access_requests` 表 + 通知
- 前端"申请权限"按钮调 API
- 管理员看申请 list
- 暂不在 v1 范围

---

## 六、与上一轮"菜单↔权限映射"方案的关系

| 阶段 | 关系 |
|---|---|
| **现在 (v4.2)** | 用户报 403，**没引导** |
| **本方案 (v1)** | 403 有引导，能找到人；但 403 本身**仍会发生**（因为菜单≠权限没解） |
| **未来 (v2)** | 菜单 = 权限，403 **根本不会发生**（除非真没勾） |

**两个方案正交**：
- 本方案 = 治标（让 403 不再"断裂体验"）
- 菜单↔权限映射 = 治本（让 403 不再发生）

**建议先做本方案**（用户痛点 = 体验断裂，不是 403 本身），菜单↔权限映射可以下一轮。

---

## 七、验收清单

- [ ] test 用户进 `/studio/leads` 看到 NoPermissionPanel（不是空白 + toast）
- [ ] 面板显示具体缺哪个 code + 中文翻译
- [ ] 面板显示本租户管理员姓名（nature 租户的 owner）
- [ ] 平台 admin 进租户页面时面板显示"平台管理员"占位
- [ ] 点 mutation 触发 403 时看到操作级 toast（带 code 详情）
- [ ] 不重复弹 toast（同页同 code 只一次）
- [ ] 不影响 401（跳登录页）
- [ ] 不影响 404/500（用现有错误处理）
- [ ] browse 验证 5 个场景
- [ ] 558 测不退化
- [ ] lint 0 错

---

## 附录 A：待 review 决策点

1. **A.1**：`<NoPermissionPanel>` 用**全屏**还是**Modal**？
   - 建议全屏（强制用户处理，不让绕过）

2. **A.2**：v1 "申请权限"按钮 = **stub**（toast "已通知"）还是 **真发**（需要后端 notification）？
   - 建议 stub（v1 范围可控）

3. **A.3**：`<QueryErrorBoundary>` 是新增组件还是用 React 19 的 `<ErrorBoundary>`？
   - 建议自实现（更细粒度控制 403/404/500 分支）

4. **A.4**：操作级 403 的 toast 重复策略 — `sessionStorage` dedupe？
   - 建议是（同 code 同 5min 内只弹一次）

5. **A.5**：管理员姓名/邮箱的来源 — `me()` 端点已经返回 tenant members，能直接拿到；不需新接口？

---

## 附录 B：相关现有文件

| 路径 | 用途 |
|---|---|
| `src/lib/api-client.ts:33-45` | `ApiError` 类（已有 details 字段，没用上） |
| `src/lib/error-codes.ts:6-42` | 错误码 → 中文映射（已有 `PERMISSION_DENIED`） |
| `src/lib/api-client.ts:88-104` | 当前 403 行为（toast 一次） |
| `src/components/auth-guard.tsx` | 路由级（v4 已有，**不动**） |
| `wedding-platform-api/src/common/exceptions/business.exception.ts:17-19` | 403 抛出点（需加 details） |
| `wedding-platform-api/src/common/auth/permissions.guard.ts:25-27` | 403 触发点（需传 details） |
| `src/lib/auth/types.ts:52-67` | `CurrentUserResponse.tenants[].roles: string[]`（无 owner 角色） |

⚠️ **风险**：`me()` 返回的 tenants 元素**没有 owner 标记**。需要：
- 方案 1：前端假设租户第一个 member 即 owner（不可靠）
- 方案 2：后端 `me()` 加 `tenantOwner: { id, displayName, email? }` 字段
- 方案 3：新增 `/api/team/members?role=owner` 端点（前端单独拉）

**建议方案 2**（最小改动，复用 `me()`）。v1 风险：用户隐私 — email 是 PII，要么**显示**（用户能找到人）要么**不显示**（隐私）。**建议默认不显示邮箱，显示 displayName + 一个"申请"按钮即可**。
