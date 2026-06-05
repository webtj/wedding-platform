# 路线图执行计划（2026-06-04）

> 配套文档：`docs/project-review-2026-06-04.md`  
> 范围：把评估报告 §5 路线图拆成可由多 agent 并行执行、每个任务独立闭环的子任务清单。  
> 测试基线：后端 38 specs / 162 用例（已绿）；前端无测试；e2e 基础设施待建（Phase 0.4）。

---

## 已锁定的技术决策

| 决策点 | 选择 | 锁定原因 |
|---|---|---|
| **Phase 0 起点** | 全 6 个 agent 并行开跑（0.1 迁移 / 0.2a-c Devex / 0.3 权限 / 0.4 Playwright） | 0.5 周内全部收口 |
| **AI Credits quota 默认值** | **1000 次 / 月 / 租户** | 够 demo 跑；正式上线前可由 PlatformSetting 覆盖 |
| **合同 PDF 模板技术** | **pdfkit**（纯 Node，60KB） | 遵循决策记录，避免 Puppeteer 50MB 镜像 |
| **Playwright 浏览器范围** | **chromium only**（MVP） | 覆盖 90% 用户场景，CI 时间短；firefox/webkit 后续再加 |

---

## 0. 总览

| Phase | 时间窗 | 任务数 | 估时 | 范围 |
|---|---|---|---|---|
| **0. 收口** | 本周 | 5 | 0.5 周 | 删档迁移落地 + Devex 三件套 + 权限闭环 + 落地清单 + e2e 基建 |
| **1. P0** | 3 个月内 | 5 | 7 周 | 合同 PDF + 短信验证 + 对象存储 + SMS + AI quota |
| **2. P1** | 3-6 个月 | 7 | 13 周 | AI SSE + 案例库 + PWA + 座位图 + 文案 + 线索打分 + 模板库 |
| **3. P2** | 6-12 个月 | 6 | 19 周 | AI 推荐 + 协作设计器 + 任务图 + 复购 + 物料市场 + AI 视频 |
| **4. P3** | 持续 | 6 | — | 前端测试 / 减少 any / 权限缓存 / CI/CD / 观测 / API 文档 |

**关键依赖图**：
```
0.1 删档迁移 ──┐
0.2 Devex ─────┼─→ 1.x 全部可启动
0.3 权限闭环 ──┤
0.4 Playwright ┘
0.5 落地清单 ── (独立)

1.4 quota 表 (0.5w) ─→ 1.1 合同 PDF (2w) ─→ 1.5 短信验证签字 (1.5w) ─┐
1.2 对象存储 (1.5w) ───────────────────────────────────────────┘
1.3 SMS 通道 (1.5w) ───────────────────────────────────────────┘
```

---

## 1. Phase 0：立即收口（本周）

### Task 0.1：应用删档迁移
- **目标**：把 `20260604_drop_finance_couple_mini` 部署到 dev DB
- **估时**：0.5 小时
- **依赖**：无
- **Agent 数**：1（顺序执行）
- **优先级**：P0 阻塞

**改动**：
- 无代码改动
- 命令：`cd wedding-platform-api && pnpm prisma migrate deploy`
- 验证 SQL 落地：`psql -c "\dt" | grep -E "plan_package|tenant_sub|channel_bind|confirmation|contract_item|asset_annotation"` 应为空

**验收**：
- [ ] 7 张表已 DROP（plan_packages / tenant_subscriptions / channel_bindings / confirmations / confirmation_events / contract_items / asset_annotations）
- [ ] 9 个 enum 已 DROP
- [ ] `tasks.assigneeType` / `project_members.role` / `process_template_tasks.assigneeType` 已变为 TEXT，默认 'planner'
- [ ] `NotificationType` / `ArchivePackageType` / `AuthProvider` / `ProjectMemberRole` 已删除对应枚举值
- [ ] Prisma client 重新生成无错

**功能测试**：
- 场景 1：登录 admin → 进"合同"列表（应有空状态，无 schema 报错）
- 场景 2：进"项目详情 → 时间线"（无 `visibleToCouple` 列冲突）
- 场景 3：进"资产管理"（annotation API 返回 404 / 200 + []，无 500）
- 场景 4：后端 `pnpm test` 全绿

**风险**：
- 影子 DB 之前因为 `20260602_add_ai_fk_relations_and_material_tenant` 失败过；deploy 模式不走 shadow DB，应该没事
- 如发现线上数据丢失需立即回滚：`prisma migrate resolve --rolled-back 20260604_drop_finance_couple_mini`

---

### Task 0.2：Devex 三件套（3 个 sub-tasks，可并行）

#### Task 0.2a：修复 AGENTS.md build 指令
- **目标**：把根 `AGENTS.md:23,46` 的 `bun build` 改为正确命令
- **估时**：10 分钟
- **Agent 数**：1
- **依赖**：无

**改动**：
- `AGENTS.md:23`：`bun build` → `bun run build`（让 npm script 接管）
- `AGENTS.md:46`：同上（admin 子段）

**验收**：
- [ ] 跑 `cd admin && bun run build` 能启动 next build
- [ ] AGENTS.md 中命令与 `package.json` 的 scripts 对齐

**功能测试**：无（文档）

---

#### Task 0.2b：修复 scripts/test.sh 的 CI 假绿
- **目标**：build 失败时正确报告 FAILED
- **估时**：15 分钟
- **Agent 数**：1
- **依赖**：无

**改动**：
- `scripts/test.sh:2` 加 `set -o pipefail`
- `scripts/test.sh:31`：把 `if eval "$cmd"` 改为 `if eval "$cmd"; then`（保留 set -e 行为）
- `scripts/test.sh:44`：把 `bun run build 2>&1 | tail -5` 改为 `bun run build`（错误完整显示）

**验收**：
- [ ] 在 `wedding-platform-admin/src/app/page.tsx` 故意写错语法 → 跑 `bash scripts/test.sh` → 看到 `Admin Type Check: FAILED` 且退出码非 0
- [ ] 改回后跑 → `Admin Type Check: PASSED`
- [ ] 没有 `tail -5` 截断

**功能测试**：
- 场景 1：故意破坏 `wedding-platform-admin/src/lib/auth/auth-client.ts` 加一个 `const x: number = "string"` → `tsc` 失败 → 整个 script 退出码非 0
- 场景 2：恢复 → 整个 script 退出码 0

**单测**：无（脚本本身）

---

#### Task 0.2c：加固 instrumentation.ts 启动链路
- **目标**：本地缺 Sentry/OTel 环境时 dev server 不挂
- **估时**：20 分钟
- **Agent 数**：1
- **依赖**：无

**改动**：
- `wedding-platform-admin/src/instrumentation.ts:1` 把 `import * as Sentry from '@sentry/nextjs'` 改为：
  ```ts
  let Sentry: typeof import('@sentry/nextjs') | null = null;
  try {
    Sentry = await import('@sentry/nextjs');
  } catch (e) {
    console.warn('[instrumentation] @sentry/nextjs not available, skipping');
  }
  ```
- `register()` 函数内 `Sentry.init(sentryOptions)` 改为 `Sentry?.init(sentryOptions)`
- ESM 异步要求：函数声明为 `async function register()`

**验收**：
- [ ] 在 `wedding-platform-admin` 临时 `pnpm remove @sentry/nextjs` → `bun dev` 仍能启动（warn log 一次）
- [ ] 装回 → Sentry 正常 init
- [ ] 验证 `pnpm build` 不破坏（instrumentation 在 build 时也会跑）

**功能测试**：
- 场景 1：`unset NEXT_PUBLIC_SENTRY_DSN && bun dev` → 启动成功，warn 出现
- 场景 2：`export NEXT_PUBLIC_SENTRY_DSN=https://... && bun dev` → 启动成功，无 warn

---

### Task 0.3：权限闭环
- **目标**：让 roles/menus/accounts 变更后 sidebar 自动刷新
- **估时**：0.5 天
- **Agent 数**：1
- **依赖**：无（但依赖 Task 0.4 的 Playwright 才能写 e2e）

**改动**：
- `wedding-platform-admin/src/lib/auth/auth-context.tsx`：在 `bootstrap` 附近 `useEffect(() => { ... })`：
  ```tsx
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => { void bootstrap(); };
    window.addEventListener(AUTH_ME_INVALIDATED_EVENT, handler);
    return () => window.removeEventListener(AUTH_ME_INVALIDATED_EVENT, handler);
  }, [bootstrap]);
  ```
- 在 `wedding-platform-admin/src/features/roles/api/queries.ts` / `menus/api/queries.ts` / `accounts/api/queries.ts` 已有的 `notifyAuthMeInvalidated()` 调用不动

**验收**：
- [ ] 浏览器 A 登录 admin → 浏览器 B（不同账号，平台 admin）改 A 的角色 → A 的 sidebar 在 5 秒内自动更新
- [ ] 不需要 reload

**功能测试**（依赖 Playwright）：
- 场景 1：两个 tab 模拟双用户，user1 登录后 user2 在另一窗口改 user1 角色 → user1 切回 tab → sidebar 1 秒内更新
- 场景 2：user1 自己改自己账号的 displayName → sidebar 头像 1 秒内更新
- 场景 3：reload fallback 仍工作（不影响原有 bootstrap 路径）

**单测**：无（事件订阅是 React 副作用，应走 e2e）

---

### Task 0.4：Playwright E2E 基础设施
- **目标**：把 e2e 框架立起来，让后续任务的 e2e 可以直接写
- **估时**：1 天
- **Agent 数**：2（并行：infra agent + 第一个 e2e 用例 agent）
- **依赖**：无
- **可并行**：

**改动**：
- `wedding-platform-admin/playwright.config.ts`：
  - baseURL: `http://localhost:3000`
  - webServer: `bun dev`（自动启动）
  - reporter: `html` + `list`
  - projects: **chromium only**（MVP；firefox / webkit 后续再加，避免拖慢 CI）
  - timeout: 30s
- `wedding-platform-admin/e2e/` 目录结构：
  ```
  e2e/
    fixtures/
      auth.ts          # 登录 fixture
      tenant.ts        # 多租户 fixture
    helpers/
      api.ts           # 调用 API 的 helper
    specs/             # 实际测试
  ```
- `package.json` 加 scripts：`"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`
- `tsconfig.json` 加 `e2e/` 到 include

**第一个 e2e 用例（作为模板）**：`e2e/specs/contract-sign-basic.spec.ts`
- 用 admin 账号登录
- 创建一个 lead + contract，提取 signToken
- 在无登录态下访问 `/contract/[token]/sign`
- 在 canvas 上画一笔
- 提交 → 看到"已签字"成功页

**验收**：
- [ ] `bun run test:e2e` 能跑通第一个用例
- [ ] 故意让用例 fail → 截图 + trace 可在 `playwright-report/` 查看
- [ ] CI 可调用（先不接 GitHub Actions，留到 P3-3）

**功能测试**：
- 场景 1：基线用例通
- 场景 2：本地 dev 跑 `bun run test:e2e:ui` 能开 UI 模式

---

### Task 0.5：更新落地清单.md
- **目标**：让 P0 范围与本计划一致
- **估时**：0.5 小时
- **Agent 数**：1
- **依赖**：无（但放在最后，因为要反映本计划输出）

**改动**：
- `落地清单.md`：把 P0 段从「财务 + 新人端 + 合同存证」改为本计划的 Phase 0 + Phase 1
- 加一行交叉引用本计划文件

**验收**：
- [ ] `落地清单.md` 的 P0 5 个工作项与本计划 Phase 0 + 1 一一对应

**功能测试**：无（文档）

---

## 2. Phase 1：P0（3 个月内，~7 周）

### Task 1.1：AI Credits 轻量 quota 表
- **目标**：替代已删的 `TenantSubscription.aiCreditsMonthly`，给所有 AI 调用加上月度配额
- **估时**：0.5 周
- **依赖**：Task 0.1
- **Agent 数**：1
- **优先级**：P0

**范围**：
- ✅ 新增 `AiQuota` model
- ✅ `QuotaService` 改造为读写 AiQuota
- ✅ 扣减逻辑（每次 AI 调用完成时）
- ❌ 不做：超额后强制拦截（先 warn + log，UI 提示）
- ❌ 不做：月度 cron 任务（先用 on-read lazy reset）

**改动**：
- 后端：
  - `prisma/schema.prisma` 新增 `model AiQuota { id, tenantId, month (YYYY-MM), creditsTotal, creditsUsed, createdAt, updatedAt }`，`@@unique([tenantId, month])`
  - `prisma/migrations/20260604_add_ai_quota/migration.sql`
  - `wedding-platform-api/src/ai-workbench/quota.service.ts`：
    - `getQuota(tenantId)`：读当月记录，不存在则 create with `creditsTotal = 1000`（默认值，可被 PlatformSetting 覆盖）
    - `consume(tenantId, credits)`：事务中 `increment creditsUsed`，返回剩余
  - `wedding-platform-api/src/ai-workbench/ai-workbench.service.ts` 4 处 `quota.consume()` 调用点
  - `packages/shared/src/business.ts` 加 `AiQuota` Zod schema
- 前端：
  - `wedding-platform-admin/src/features/ai-workbench/components/quota-badge.tsx`：在 AI 工作台顶部展示 `已用 X / 总额 Y`
- 文档：
  - `DESIGN.md` 加 quota UI 规范（如未存在）

**验收**：
- [ ] 创建 tenant → 自动有当月 quota 记录（creditsTotal=1000）
- [ ] AI 工作台生成一次图 → creditsUsed +1
- [ ] 前端 quota badge 实时刷新
- [ ] 1000 次后不报错，只 warn（log 中出现 `quota exceeded`）

**功能测试**：
- 场景 1：新建租户 → 进 AI 工作台 → 看到 `0 / 1000`
- 场景 2：上传 1 张图生成 → 看到 `1 / 1000`
- 场景 3：seed 改 creditsTotal=2，跑 3 次 → 第 3 次后控制台 warn，前端仍可点（不强制拦）

**单测 / 集成测试**：
- `quota.service.spec.ts`：getQuota / consume / 并发安全（mock prisma）
- `ai-workbench.service.spec.ts`：调用 consume 成功
- 新增 `ai-quota.e2e.spec.ts`：HTTP 端到端

---

### Task 1.2：对象存储抽象 + 缩略图
- **目标**：把 `fs.writeFileSync` 替换为 provider 抽象，本地 + OSS（阿里云）+ COS（腾讯云）实现
- **估时**：1.5 周
- **依赖**：Task 0.1
- **Agent 数**：3（并行：abstract agent + OSS agent + 缩略图 agent）

**Agent 拆分**：
- **Agent A（后端基础设施）**：1.5 周
  - ObjectStorageService 接口 + LocalProvider 实现 + 工厂 + 配置注入
  - 把 storage.module.ts 现有 fs 调用全部切到新接口
- **Agent B（OSS Provider）**：1 周（可与 A 串行）
  - `providers/oss.provider.ts` 用 `ali-oss` SDK
  - 配置走 PlatformSetting `oss_config`（JSON 加密存储）
- **Agent C（缩略图服务）**：1 周（可与 A 并行）
  - 用 `sharp` 生成 thumbnail
  - 新增 `AssetVariant` model 或 `Asset.thumbnailKey` 字段
  - 在上传 hook 里异步生成

**范围**：
- ✅ 本地 / OSS / COS 三种 provider
- ✅ 缩略图（image/* 用 sharp，视频暂不处理）
- ✅ 工厂模式（按 PlatformSetting 切换）
- ❌ 不做：CDN 域名（OSS 走自有 bucket 域名即可）
- ❌ 不做：大文件分片上传（留到 P1-1 之后）

**改动**：
- 后端：
  - `wedding-platform-api/src/storage/object-storage.service.ts`：拆为 `object-storage.interface.ts` + `providers/{local,oss,cos}.provider.ts` + `object-storage.factory.ts`
  - `wedding-platform-api/src/storage/thumbnail.service.ts` 新增
  - `prisma/schema.prisma`：`model Asset` 加 `thumbnailKey String?` + `thumbnailUrl String?`
  - `prisma/migrations/20260604_add_thumbnail/migration.sql`
  - `wedding-platform-api/src/storage/storage.module.ts`：注册 providers
  - `wedding-platform-api/src/assets/assets.service.ts`：上传完成后触发缩略图（fire-and-forget）
- 前端：
  - `wedding-platform-admin/src/features/assets/components/asset-card.tsx`：用 `thumbnailUrl` 优先于 `objectKey`
  - `wedding-platform-admin/src/features/assets/components/asset-grid.tsx`：加载缩略图 + skeleton
- 文档：
  - `docs/object-storage-providers.md`（新增）：OSS / COS 配置步骤

**验收**：
- [ ] `pnpm dev` 默认走 local provider，无回归
- [ ] 把 `oss_config` 写入 PlatformSetting → 重启 → 走 OSS（用 test bucket 验证上传下载）
- [ ] 上传一张图 → 1 秒内 `Asset.thumbnailKey` 出现，前端 grid 缩略图显示
- [ ] 视频文件不生成缩略图（前端显示原文件 icon）

**功能测试**：
- 场景 1（local）：默认配置上传 5 张图 → grid 看到 5 张缩略图
- 场景 2（OSS）：填入 test bucket key/secret → 上传 1 张图 → OSS 控制台看到文件 + thumbnail 文件
- 场景 3（隔离）：tenant A 上传 → tenant B 在 OSS 里看不到（不同 prefix）

**单测 / 集成测试**：
- `object-storage.factory.spec.ts`：根据 PlatformSetting 选 provider
- `oss.provider.spec.ts`：mock ali-oss，验证 putObject / getSignedUrl
- `thumbnail.service.spec.ts`：用 test buffer 验证尺寸 / 格式
- `assets.service.spec.ts`：上传后 thumbKey 被设

---

### Task 1.3：SMS 真实通道接入
- **目标**：把 `MessageSenderService.sendSms` 占位实现替换为阿里云 SMS
- **估时**：1.5 周
- **依赖**：无
- **Agent 数**：2（并行：抽象 + Provider）
- **优先级**：P0

**Agent 拆分**：
- **Agent A（接口）**：0.5 周
  - `SmsService` 接口 + `AliyunSmsProvider` + 工厂
  - PlatformSetting `sms_provider` 已有，复用
- **Agent B（应用集成）**：1 周
  - `MessageSenderService.sendSms` 改造
  - 模板（task_reminder / contract_sign / custom）

**范围**：
- ✅ 阿里云 SMS（aliyun-sdk）
- ✅ dev 环境走 mock provider（log 而不真发）
- ❌ 不做：腾讯云 / Twilio（先一家跑通）

**改动**：
- 后端：
  - `wedding-platform-api/src/notifications/sms/sms.service.ts`（接口）
  - `wedding-platform-api/src/notifications/sms/providers/{mock,aliyun}.provider.ts`
  - `wedding-platform-api/src/notifications/sms/sms.factory.ts`
  - `wedding-platform-api/src/notifications/message-sender.service.ts`：替换占位实现
  - `wedding-platform-api/src/notifications/notifications.module.ts`：注册 SmsModule
- 前端：
  - `wedding-platform-admin/src/features/notifications/components/sms-test-panel.tsx`（平台 admin 用）：发一条测试 SMS
- 文档：
  - `docs/sms-setup.md`（新增）：阿里云 accessKey 申请 + 模板申请步骤

**验收**：
- [ ] dev 环境进 `sms-test-panel` → 填入手机号 → log 出现 `[SMS Mock] To: ...`
- [ ] 配置阿里云 key → 真实收到短信
- [ ] `MessageSenderService.sendSms` 的占位 comment 移除

**功能测试**：
- 场景 1（mock）：dev 跑 → 平台 admin 页面发测试 → 控制台日志
- 场景 2（aliyun）：真 accessKey → 收短信
- 场景 3（幂等）：同一通知 1 分钟内发两次 → 第二次被 dedup（去重表，避免重复扣费）

**单测 / 集成测试**：
- `sms.factory.spec.ts`：根据 setting 选 provider
- `aliyun.provider.spec.ts`：mock SDK，verify 参数
- `message-sender.service.spec.ts`：替换后行为正确

---

### Task 1.4：合同 PDF 存证
- **目标**：签字完成的合同自动生成 PDF 存证
- **估时**：2 周
- **依赖**：Task 1.2（PDF 存到对象存储）
- **Agent 数**：2（并行：PDF 服务 + UI 集成）

**Agent 拆分**：
- **Agent A（PDF 生成服务）**：1 周
  - 用 `pdfkit` 模板（不用 puppeteer，节省镜像 + 资源，遵循决策记录）
  - 模板：标题 / 双方信息 / 服务内容 / 签字图 / 时间戳 / 二维码（防伪）
- **Agent B（签字流程集成）**：1 周
  - `contracts.service.ts.sign()`：签字完成 → 调 PDF → 上传对象存储 → 写 `Contract.pdfUrl`
  - 前端签字页：签字后看到"合同已生成"链接

**范围**：
- ✅ 已签字合同生成 PDF
- ✅ PDF 存对象存储（依赖 1.2）
- ✅ 二维码扫码查真伪（用 `qrcode` 库 + `/contract/verify/[id]` 公开页）
- ❌ 不做：被拒合同的 PDF
- ❌ 不做：合同到期提醒（P0-2 之外）
- **技术选型锁定**：用 `pdfkit`（纯 Node，无 headless 浏览器依赖，60KB），不引入 Puppeteer

**改动**：
- 后端：
  - `wedding-platform-api/src/contracts/pdf/contract-pdf.service.ts` 新增
  - `wedding-platform-api/src/contracts/pdf/contract-pdf.template.ts`：模板定义
  - `wedding-platform-api/src/contracts/contracts.service.ts`：`sign()` 后 hook
  - `prisma/schema.prisma`：`model Contract` 加 `pdfUrl String?` + `pdfGeneratedAt DateTime?`
  - `prisma/migrations/20260604_add_contract_pdf/migration.sql`
  - `wedding-platform-api/src/contracts/verify/verify.controller.ts` 新增（公开 GET）
  - `wedding-platform-admin/src/app/contract/verify/[id]/page.tsx` 新增
- 前端：
  - `wedding-platform-admin/src/app/contract/[token]/sign/page.tsx`：签字成功 → 跳转"已生成 PDF"提示
  - `wedding-platform-admin/src/features/contracts/components/contract-detail.tsx`："下载 PDF"按钮
- 文档：
  - `docs/contract-pdf-template.md`（新增）：模板字段表

**验收**：
- [ ] 签完一份合同 → 30 秒内 `Contract.pdfUrl` 出现
- [ ] 在合同详情点"下载" → 拿到 PDF，签字图清晰可见
- [ ] 扫码 QR → 跳转到 verify 页 → 看到合同摘要
- [ ] verify 页不需要登录

**功能测试**：
- 场景 1：完整签字流 → 下载 PDF → PDF 包含双方信息 + 签字图 + 合同号
- 场景 2：扫码 → 公开 verify 页显示
- 场景 3：tenant 隔离：A 签的合同，B 扫码看不到

**单测 / 集成测试**：
- `contract-pdf.service.spec.ts`：模板渲染（snapshot test）
- `contracts.service.spec.ts`：sign() 后 pdfUrl 写入
- `verify.controller.spec.ts`：公开访问权限

---

### Task 1.5：合同短信验证签字
- **目标**：签字前必须输入手机验证码（防链接泄露）
- **估时**：1.5 周
- **依赖**：Task 1.3（SMS）+ Task 1.4（PDF 流程）
- **Agent 数**：2（并行：后端 + 前端）

**Agent 拆分**：
- **Agent A（后端）**：1 周
  - 合同发送时生成 SMS code（6 位），存 `Contract.signVerifyCode`（bcrypt）+ `signVerifyCodeExpiresAt`
  - 新增 `POST /contracts/:id/resend-code`（5 分钟内最多 3 次）
  - `POST /contracts/sign/:token` 接受 `code` 参数
- **Agent B（前端）**：0.5 周
  - 签字页加"输入验证码"步骤
  - "重新发送"按钮（带 60s 倒计时）

**范围**：
- ✅ SMS 验证码（6 位数字）
- ✅ 5 分钟内 3 次重发限制
- ✅ 验证码 10 分钟过期
- ❌ 不做：语音验证码
- ❌ 不做：图形验证码（防刷）

**改动**：
- 后端：
  - `prisma/schema.prisma`：`model Contract` 加 `signVerifyCode String?` + `signVerifyCodeExpiresAt DateTime?` + `signVerifyAttempts Int @default(0)`
  - `prisma/migrations/20260604_add_sign_verify_code/migration.sql`
  - `wedding-platform-api/src/contracts/sign-verification.service.ts` 新增
  - `wedding-platform-api/src/contracts/contracts.controller.ts`：发送时调 SMS、签字时 verify
  - `wedding-platform-api/src/contracts/contracts.service.ts`：sendSignLink / verifyCode / sign
- 前端：
  - `wedding-platform-admin/src/app/contract/[token]/sign/page.tsx`：分两步（输码 → 签字）
  - `wedding-platform-admin/src/app/contract/[token]/sign/verify-code-step.tsx` 新增

**验收**：
- [ ] 发送合同 → 收件人手机收到 6 位码
- [ ] 输错 5 次 → 锁定 10 分钟
- [ ] 5 分钟内点"重发"3 次后被拦
- [ ] 正确验证码 → 进入签字页

**功能测试**：
- 场景 1：mock SMS → 全流程跑通
- 场景 2：错误码 3 次 → 看到"还有 2 次"
- 场景 3：超时 → 重新发送

**单测 / 集成测试**：
- `sign-verification.service.spec.ts`：生成 / 校验 / 重发限制 / 锁定
- `contracts.service.spec.ts`：sign with code

---

## 3. Phase 2：P1（3-6 个月，~13 周）

### Task 2.1：AI 工作台 SSE 流式输出
- **目标**：图片生成过程实时显示进度（当前是 30s+ 黑屏）
- **估时**：1 周
- **Agent 数**：1
- **依赖**：无
- **优先级**：P1-1

**改动**：
- 后端：
  - `wedding-platform-api/src/ai-workbench/events/generation-events.service.ts`：补 SSE 端点 `GET /ai-workbench/generations/:id/events`
  - `wedding-platform-api/src/ai-workbench/ai-workbench.controller.ts`：注册 SSE
- 前端：
  - `wedding-platform-admin/src/features/ai-workbench/hooks/use-generation-events.ts` 新增
  - `wedding-platform-admin/src/features/ai-workbench/components/generation-progress.tsx`：进度条 + 阶段文字
  - `wedding-platform-admin/src/features/ai-workbench/components/ai-workbench-view-page.tsx`：替换 polling

**验收**：
- [ ] 提交生成 → 1 秒内看到"准备中" → 5-10s 内"生成中" → 完成时图片渐入
- [ ] 失败时显示错误 toast

**功能测试**：
- 场景 1：成功生成 → 看到 3 阶段进度
- 场景 2：网络中断 → 重连
- 场景 3：mock 5s 延迟 → 进度条正确推进

**单测**：sse controller / events.service

---

### Task 2.2：AI 案例库
- **目标**：团队 / 平台级公共案例库 + 一键改稿
- **估时**：2 周
- **依赖**：Task 1.1（quota 跟踪）
- **Agent 数**：3（并行：DB / 后端 / 前端）

**改动**：
- 后端：
  - 新增 `model AiCase { id, tenantId (nullable for platform), projectId, name, promptSnapshot, imageUrl, isPublic, createdByUserId, createdAt }`
  - `wedding-platform-api/src/ai-workbench/cases/`：CRUD + search + public/list
  - 一键改稿：复用 generation endpoint，传 `sourceGenerationId`
- 前端：
  - `wedding-platform-admin/src/features/ai-workbench/components/case-library.tsx`：网格 + 筛选
  - 一键改稿按钮

**验收**：
- [ ] 个人案例 / 团队案例 / 平台公共案例三层可见性正确
- [ ] 一键改稿生成新图，prompt 自动带原图 prompt

**功能测试**：
- 场景 1：保存到团队库 → 同租户其他人看到
- 场景 2：保存为公开 → 跨租户看到
- 场景 3：改稿 prompt 自动填充

**单测**：cases service / 一键改稿复用 generation 逻辑

---

### Task 2.3：轻量 PWA 现场模式
- **目标**：现场执行模式，替代删档的 mini app
- **估时**：3 周
- **依赖**：Task 1.3（SMS）
- **Agent 数**：2（并行：PWA 框架 + 现场模式页面）

**范围**：
- ✅ manifest + service worker（workbox）
- ✅ 现场模式页面：时间线 / 任务 / 拍照上传
- ❌ 不做：原生 iOS / Android（用 PWA 替代）

**改动**：
- `wedding-platform-admin/public/manifest.json` + `sw.js`
- `wedding-platform-admin/src/app/field/page.tsx` 新增
- `wedding-platform-admin/src/features/field/` 整套 feature

**验收**：
- [ ] 现场模式可离线浏览时间线（30 分钟内编辑不丢）
- [ ] 在线后自动同步
- [ ] SMS 推送给下一棒（依赖 1.3）

**功能测试**：
- 场景 1：飞行模式 → 仍能看时间线
- 场景 2：现场拍照 → 资产上传
- 场景 3：完成一个任务 → 策划师手机收到 SMS

**单测**：service worker / 离线缓存逻辑

---

### Task 2.4：座位安排
- **目标**：拖拽 + AI 自动排
- **估时**：3 周
- **依赖**：无
- **Agent 数**：2

**范围**：
- ✅ 桌型 / 座位 CRUD
- ✅ 拖拽（dnd-kit）
- ✅ AI 自动排（基于关系：家人 / 朋友 / 同事）
- ❌ 不做：3D 预览

**改动**：
- `prisma/schema.prisma`：`model SeatingTable` + `model SeatingAssignment`
- `wedding-platform-api/src/seating/`：service + controller
- `wedding-platform-admin/src/features/seating/`：拖拽 + AI 按钮

**验收**：
- [ ] 10 桌 100 人拖拽流畅（<16ms 响应）
- [ ] AI 自动排准确率 80%+（按关系分组）

**功能测试**：
- 场景 1：导入宾客名单 → 拖拽分配 → 保存
- 场景 2：AI 自动排 → 校验关系分组

---

### Task 2.5：文案生成流式 + 多版本对比
- **估时**：1 周
- **依赖**：Task 2.1（SSE 经验复用）
- **Agent 数**：1

**改动**：
- 复用 SSE 流式
- 多版本并存：左侧历史版本，右侧新生成
- 选版本号 → 直接保存

**验收**：
- [ ] 生成 3 个版本 → 三栏对比 → 选一个

---

### Task 2.6：线索打分 + SLA 监控
- **估时**：2 周
- **依赖**：无
- **Agent 数**：2（并行：打分引擎 / SLA 监控）

**改动**：
- `prisma/schema.prisma`：`model LeadScore` + `Lead.slaDeadline`
- `wedding-platform-api/src/crm/scoring/`：规则引擎 + cron
- `wedding-platform-api/src/crm/sla/`：超时检测 + SMS 告警
- 前端：线索列表加分数列 / SLA 倒计时

---

### Task 2.7：内置流程模板库
- **估时**：1 周
- **Agent 数**：1

**改动**：
- seed：3 套模板（5w / 10w / 豪华）
- 前端：模板市场页

---

## 4. Phase 3：P2（6-12 个月，~19 周）

> P2 任务细节会在 P1 完成时细化；此处仅给目标和关键决策点。

### Task 3.1：AI 智能推荐（4 周）
- 基于合同金额 / 婚期 / 客户标签推荐模板
- 决策点：用 pgvector 还是 MySQL 简单打分？

### Task 3.2：协作设计器 + 3D 预览（4 周）
- WebSocket 多人编辑
- 决策点：自研 CRDT 还是 Yjs？

### Task 3.3：任务依赖图 + 甘特图（2 周）
- 复用 dnd-kit 拖拽
- 决策点：用 visx / d3 / 商业库？

### Task 3.4：复购 / 周年回访（2 周）
- 定时任务
- 决策点：与现有 SMS 复用

### Task 3.5：物料 SaaS 模板市场（4 周）
- 商家上传 + 分润
- 决策点：支付接入（微信/支付宝）

### Task 3.6：AI 视频生成（3 周）
- Sora / 可灵
- 决策点：哪个 provider 先接

---

## 5. Phase 4：P3（持续工程债务）

### Task 4.1：前端 Vitest + Playwright 全面铺开
- **估时**：4 周
- **Agent 数**：3（按业务域分）
- **范围**：每个 `features/*` 加至少 1 个 component spec + 1 个 e2e

### Task 4.2：减少 `any` / Prisma JSON Zod schema
- **估时**：2 周
- **Agent 数**：2
- **范围**：349 处 `any` 中至少 200 处加 Zod / 类型

### Task 4.3：权限 Redis 缓存
- **估时**：1 周
- **依赖**：生产 Redis 已就绪
- **范围**：把 `permission.findMany` 缓存到 Redis（TTL 5min）

### Task 4.4：CI/CD（GitHub Actions）
- **估时**：1 周
- **范围**：lint + test + e2e + prisma migrate verify
- 关键：必须在 Task 0.2b 之后做，否则 CI 假绿仍存在

### Task 4.5：Sentry / OpenTelemetry
- **估时**：1 周
- **依赖**：Task 0.2c 已加固 instrumentation

### Task 4.6：OpenAPI 文档
- **估时**：1 周
- **范围**：用 `@nestjs/swagger` 自动生成，挂在 `/api/docs`

---

## 6. 并行 Agent 编排

### Phase 0 编排
```
Day 1:
  Agent A: Task 0.1（应用迁移，串行）
  Agent B: Task 0.2a（AGENTS.md）
  Agent C: Task 0.2b（test.sh）
  Agent D: Task 0.2c（instrumentation.ts）
  Agent E: Task 0.3（权限闭环）
  Agent F: Task 0.4（Playwright 基建）
Day 2:
  Agent A: Task 0.5（落地清单）
```

### Phase 1 编排
```
Week 1:  Task 1.1（quota 表，单 agent 串行）
         Task 1.2A（ObjectStorage 接口，本周可启）
         Task 1.3A（SMS 接口，本周可启）
Week 2:  Task 1.2B（OSS Provider）+ Task 1.2C（缩略图）+ Task 1.3B（应用集成）
Week 3-4: Task 1.4A（PDF 服务）+ Task 1.4B（UI 集成）
Week 4-5: Task 1.5A（后端 SMS verify）+ Task 1.5B（前端 UI）
Week 5.5: 全量回归 + E2E
```

**关键纪律**：
- 每个 Task 完工必须满足：自己 `pnpm test` 全绿 + 自己的 E2E 通过 + 自己写 commit message
- 不允许跨 Task 改对方的文件
- 跨 Task 接口变更（schema / DTO）需在 `docs/roadmap-execution-plan-2026-06-04.md` 追加 ADR

---

## 7. 测试策略

### 7.1 测试金字塔
```
       E2E (Playwright)        —— 每个 Task 至少 1 个关键路径
      /                     \
    Integration (Vitest + test DB)  —— 每个 service
   /                         \
  Unit (Vitest)               —— 纯函数 / 工具
```

### 7.2 每个 Task 必须交付
- [ ] `*.spec.ts` 单测（与 code 同 PR）
- [ ] `*.e2e.spec.ts` 至少 1 个（如果 Task 有 UI 或 HTTP）
- [ ] 手动验收脚本（贴在 PR description 里）

### 7.3 测试基础设施
- Phase 0.4 后所有新功能必须用 Playwright
- 已有 38 specs 持续维护，删档任务同步删 spec
- CI 在 Phase 4.4 接入

### 7.4 不写测试的例外
- 配置 / 文档 / migration 单独文件
- 纯 UI 调整（颜色 / 间距）—— 走设计走查

---

## 8. 风险登记

| 风险 | 影响 | 缓解 |
|---|---|---|
| Prisma migration 与 live DB 漂移 | Task 0.1 可能 fail | 先在 staging 试，失败回滚 `prisma migrate resolve --rolled-back` |
| Agent 间 schema 冲突 | Phase 1 多人改 schema | 强制串行 schema 改动窗口，每天只 1 个 merge |
| OSS / 阿里云 accessKey 泄露 | 安全 | 走 PlatformSetting 加密存储，dev 用 .env 隔离 |
| Playwright 在 macOS / Linux 不一致 | CI 卡住 | Mac 优先开发，CI 跑 Linux image，DRY-RUN 在本地 |
| SMS 真实通道被刷 | 财务风险 | dev mock / 限额 / 阿里云 template_id 审查 |
| P1 任务依赖 P0 的 quota / SMS 落地 | P1 排期 | 严格按依赖顺序，P0 全部绿才能开 P1 |
| e2e 不稳定 | 整个 PR 流程卡 | 重试机制 + 截图 + 关键路径不用 e2e 写（用单测） |
| 座位图性能（100+ 宾客） | UX | 先做 50 人的 demo，再决定虚拟化 |
| AI 视频成本失控 | 财务 | 复用 quota 限流，preview 用低分辨率 |
| P3 任务被业务打断 | 长期 | 每月 1 周 P3 周，业务 / P0 不占用 |

---

## 9. 完成定义（DoD）

每个 Task 完成必须满足：

- [ ] 代码：所有文件按计划改动
- [ ] 类型：`pnpm tsc --noEmit` 0 错
- [ ] 单测：新增 / 修改 service 100% 有 spec，覆盖率不低于现状
- [ ] 集成 / e2e：Task 验收的所有场景通过
- [ ] 文档：API 变更同步到 `docs/`、README 同步命令
- [ ] 数据库：`prisma migrate dev` 生成 migration，应用到 dev DB 成功
- [ ] Commit：单独 commit，message 含 Task ID
- [ ] 不引入新 lint 错误
- [ ] Owner sign-off（谁执行谁负责到底）

---

## 10. 不在本计划范围

- 删档的财务 / 新人端 / 移动端（决策已定，不再展开）
- 内部使用的 admin 工具（如 AI prompt 调试台）—— 工程师自己搞定
- 数据迁移 / 备份 / 容灾（运维范畴）
- 融资 / 商务 / 法务（不是工程任务）

---

**维护纪律**：本计划文件随 P0/P1 推进每周更新一次；新增 Task 必须先在 `docs/roadmap-execution-plan-2026-06-04.md` 写 ADR 再开 PR。
