# 项目全维度评估报告

日期：2026-06-04  
范围：架构、产品功能、竞品对标、工程质量、优化路线  
基线：双子项目 monorepo（`wedding-platform-admin` / `wedding-platform-api`）  
代码基线：后端 191 TS / 44 controllers / 62 services / 38 specs（162 用例）｜ 前端 148 TS/TSX / 60K+ 行 ｜ 33 Prisma 迁移

---

## 1. 一句话总结

> **工程地基 7.5/10，AI + 场景设计器是真护城河；财务/新人端/移动端已主动砍掉，专注单端策划师 OS + 差异化 AI。**

- 项目的本质：**AI 原生的婚礼策划 OS**（工具流 + AI 流双引擎），不是普通的婚礼公司 CRM。
- 罕见的工程深度（**战略假设**，下同）：**AI 工作台**（意图识别 + Prompt Planner + DesignState + 候选图 + 参考图）在国内婚礼 SaaS 无对手 —— 这个判断是基于代码深度（967 行 ai-workbench.service.ts）和已知竞品公开信息的推断，不构成对所有竞品的事实覆盖。
- 隐藏护城河（**战略假设**）：**2D 场景设计器**（PIXI.js v8 + Scene AI Service 522 行），对标 AllSeated —— 是否真的"国内独家"需要后续做竞品 demo 反查才能坐实。
- 战略收敛：放弃商业闭环三件套（财务/新人端/移动端），集中资源把单端 AI + 设计器做到行业最强。

---

## 2. 战略定位 & 竞品对标

### 2.1 你的定位

- 上游：意向单 → 合同 → 项目
- 中游：任务 / 物料 / 资产
- 下游：婚礼当日时间线 + 归档交付
- 横向：**AI 工作台**（视觉 + 文案） + **场景设计器**（2D 平面图）

### 2.2 竞品矩阵（**战略假设**，下表所有数值均为团队判断、非经实测）

> 这张表的作用是**给路线决策提供方向**，不是给外部展示用的事实结论。  
> 数值来自对各竞品官网 / 公开 demo / 行业文章的快速扫描 + 团队从业经验加权，**没做严格 demo 反查**。  
> 像"HoneyBook 70% 活跃度来自客户端""国内婚礼 SaaS 无对手"这类话，**只适合拿来做战略判断，不适合写死**。后续如果要做对外材料或融资 BP，需要先把每条都坐实。

| 维度 | 本项目 | HoneyBook | Aisle Planner | 婚云/婚礼纪商家 | Notion + Canva |
|---|---|---|---|---|---|
| CRM 线索 | 8 | 9 | 8 | 7 | 5 |
| 合同 + 电子签 | 6 | **10** | 9 | 7 | 3 |
| 项目看板 / 任务 | 7 | 7 | 9 | 6 | 9 |
| 婚礼时间线 | 7 | 5 | **10** | 8 | 4 |
| **AI 视觉生成** | **8** ⭐ | 0 | 0 | 2 | 7 |
| **2D 场地设计器** | **6** ⭐ | 0 | 7 | 4 | 0 |
| 多租户 SaaS | 8 | 10 | 9 | 8 | N/A |

结论（**战略假设**）：聚焦 AI + 设计器差异化；与 HoneyBook 走不同道路（不正面竞争商业闭环，而是吸引追求"AI 提效"的策划师）。

---

## 3. 模块逐项评分

### 3.1 CRM / 线索管理 — **7.5**

- 全生命周期：线索 → 客户 → 项目 → 合同 → 归档
- 自动从合同创建项目 / 客户转化追踪
- 缺口：-1.0 无线索打分（高/中/低 优先级）、-0.5 无重复线索合并、-0.3 无来源归因（小红书/抖音/朋友）
- 代码：`wedding-platform-api/src/crm/`（5 个 service）

### 3.2 合同 + 电子签名 — **6.0**

- 合同 + 签字 token 机制（**手写签名 + 拒签 + 公开签字页** —— 关键能力保留）
- 状态机：`draft → sent → signed / rejected`
- 缺口：
  - **-2.0** 无 PDF 存证（截图保存是土法，但合规不够）
  - **-1.0** 无短信验证码签字（仅 link + 签名）
  - **-0.5** 无合同模板变量插入（公司名/套餐/服务项/金额）
  - **-0.3** 无多轮修改/版本
  - **-0.2** 无合同到期提醒
- 代码：`wedding-platform-api/src/contracts/`（11 文件）

### 3.3 项目管理（看板 + 时间线 + 任务）— **7.5**

- 看板（dnd-kit）/ 时间线 / 任务三视图
- `ProcessTemplate → Stage → Task → ChecklistItem` 四层模板
- 任务可指派角色 + 优先级 + 截止日期 + 阶段联动
- 缺口：-1.0 无任务依赖图/甘特图、-0.5 无任务评论/活动流、-0.3 无子任务拖拽排序、-0.2 无任务模板

### 3.4 婚礼当日时间线 — **7.0**

- 时间块 + 负责人 + 场地 + 备注
- 婚礼倒计时 + 阶段进度联动
- 缺口：-1.0 无实时多人编辑冲突解决、-0.5 无移动端现场模式（P1-3 待做）、-0.3 无自动通知下一棒（改用 SMS）、-0.2 无打印版/客户分享版

### 3.5 AI 工作台（视觉生成）— **8.5** ⭐ 护城河（**深度是事实，独家性是战略假设**）

- **AI 工作台**（意图识别 + Prompt Planner + DesignState）—— 967 行 service，**代码深度是事实**（ai-workbench.service.ts 行数可数）
- Provider 能力矩阵：OpenAI 支持 `text2img` / `img2img` / `edit`；ModelScope 仅 `text2img`（`provider-router.service.ts:30, 117`）；前端 AI type 暴露 `text2img | img2img`（types.ts:2）—— **功能矩阵是事实**
- "国内婚礼 SaaS 唯一"是**战略假设**，没做严格 demo 反查
- 候选图 + 参考图 + 反馈学习 + 历史复用
- 视觉风格预设（自然风/复古风/轻奢风/极简风）
- 缺口：
  - **-1.0** SSE 流式（已用 RxJS 但没接 SSE，UX 有顿挫感）
  - **-0.3** 无团队公共案例库
  - **-0.1** 无 AI Credits 真实计费
  - **-0.1** 无 negative prompt

### 3.6 AI 文案生成 — **5.5**

- 4 类文案：誓言 / 致辞 / 社交 / 策划师营销
- 模板化 prompt + 可调风格
- 缺口：-1.5 无多版本对比、-1.0 无精修（regenerate 部分段落）、-0.5 无客户语言习惯学习、-0.3 无文案例库、-0.2 无字数控制

### 3.7 2D 场景设计器（PIXI.js）— **6.5** ⭐ 隐藏护城河

- **PIXI.js v8 + 自研 Scene AI Service**（522 行）—— 行业独有
- 拖拽 + 对齐辅助线 + 缩放无关坐标
- 缺口：
  - **-1.5** 无图层管理 / 锁定 / 隐藏
  - **-1.0** 无 PS 式二次编辑（已主动放弃 — 与产品定位冲突）
  - **-0.5** 无 3D 预览
  - **-0.3** 无协作多人编辑
  - **-0.2** 无素材市场

### ~~3.8 财务管理 — 2.0~~ ❌ **已删档**

> 砍掉原因：开发投入 3 周做 Payment/Expense/Invoice 性价比低；新人支付场景已被微信/支付宝自有收银台覆盖。  
> 删除范围：`PlanPackage` / `TenantSubscription` / `ContractItem` 表 + `Contract.amountCents` & `depositCents` 字段 + 财务统计逻辑。  
> 迁移：见 `wedding-platform-api/prisma/migrations/20260604_drop_finance_couple_mini/migration.sql`。

### ~~3.9 新人协作端（Couple Portal） — 1.0~~ ❌ **已删档**

> 砍掉原因：H5 + 小程序需要单独端口、再加 4 周开发 + 长期维护；与"策划师 OS"定位不符。  
> 删除范围：`Confirmation` / `ConfirmationEvent` / `AssetAnnotation` 表 + `TaskAssigneeType.couple` 枚举 + `ProjectMemberRole.couple` + `AssetRetentionPolicy.allowCoupleDownload` + `WeddingTimelineItem.visibleToCouple` + 通知 `annotation`/`confirmation` 类型。  
> 保留：合同签字页（`/app/contract/[token]/sign`）—— 走公开链接，新人用 link 直接进，**无需注册**。

### 3.8 通知中心 — **6.0**

- 7 种类型（task / task_reminder / asset / ai / system / contract_update / system_alert）、3 种通道
- 用户偏好独立表 + in-app 全实现
- 缺口：
  - **-2.0** SMS / Email **没真实实现**（只占位 in-app）
  - **-1.0** 无通知规则引擎
  - **-0.5** 无通知聚合
  - **-0.3** 无移动 Push
  - **-0.2** 无"勿扰时段"

### 3.9 权限 / 多租户 / 平台管理 — **7.5**

- 三层权限：`PlatformAdmin` → `Role`（细粒度 Permission）→ `RoleMenuItem`（动态菜单）
- 严格多租户隔离（所有表 `tenantId`）
- `RoleScope` 区分平台 vs 租户
- 内置角色 + 自定义角色
- 平台设置（`encrypted` 标志）
- 缺口：
  - **-1.0** **权限态不自刷新**：`auth-client.ts:67` 定义 `wedding-auth-me-invalidated` 事件、`auth-client.ts:100` 在 mutations 端 dispatch；`roles/queries.ts:43` / `menus/queries.ts:22` / `accounts/queries.ts:36` 都在 `onSuccess` 调 `notifyAuthMeInvalidated()`；但 **没有任何 listener 订阅这个事件**（`auth-context.tsx:185` 只做 bootstrap/revalidate，没挂 `addEventListener`）。结果：当前用户的 sidebar / 菜单 / 权限在他人/自己改完角色或菜单后**不会自动刷新**，只能 reload。属于"基础有了，闭环没合上"。
  - **-0.5** 无权限缓存（每请求查 DB）
  - **-0.3** 审计日志无查询页面
  - **-0.2** 无数据导出 / 删除（GDPR / 个保法）
  - **-0.1** `encrypted` 字段未确认实现加密
  - **-0.4** ~~AI Credits 限额~~（已删 TenantSubscription 后失去 quota 来源，下一版需轻量 quota 表）

### 3.10 流程模板 — **7.5**

- 四层 `ProcessTemplate → Stage → Task → ChecklistItem → Assignee`
- `offsetDays`（相对婚期）—— 行业标准
- 缺口：无内置模板库、无版本管理、无模板市场、无应用前预览、无模板分析

### 3.11 资产管理 — **7.0**

- 版本控制 + 归档保留策略 + 软删除
- 缺口：
  - **-1.0** 无缩略图 / CDN
  - **-0.5** 无水印
  - **-0.5** 无批量上传 / 文件夹（婚礼摄影一次 1000+ 张）
  - **-0.5** 无 EXIF
  - **-0.3** 本地存储 `fs.writeFileSync`，生产不可用
  - **-0.2** 无大文件分片上传

### 3.12 物料管理 — **6.0**

- 分类 + 物料 + 任务-物料关联（`confirmed`）
- 缺口：无库存进出记录、无供应商管理、无图片、无租赁/自有标识、无归还检查

### 3.13 报表 / 经营分析 / 工作台 — **4.0**

- 4 个统计卡片（线索数 / 项目数 / 当月合同数 / 已签合同数）+ 漏斗 + 趋势 + 饼图 + 最近合同
- 缺口：无营收/盈亏（仅统计数量）、无绩效、无复购、无自定义、无 Excel/PDF 导出、无时间维度切换、无数据钻取

### ~~3.16 婚礼小程序 / 移动端 — 3.0~~ ❌ **已删档**

> 砍掉原因：与战略一致（聚焦单端策划师 OS）；婚礼策划师 80% 时间在外跑的需求，未来用"轻量 PWA + SMS 通知"代替，而非原生小程序。  
> 删除范围：`ChannelBinding` 表 + `wechat_mini` / `douyin_mini` AuthProvider + `mini.controller.ts` 模块 + `channels.controller.ts` 模块。

### 3.14 测试 / 工程质量 — **5.5**

- 后端 38 specs（162 用例，约 25% 覆盖）
- 前端几乎无测试（仅 1 个 `types.test.ts`）
- 无 E2E、TS 妥协 349 处（Prisma JSON 主因）
- TODO/FIXME = 0（代码相对干净）
- **Devex 段（这条最具体）**：
  - **`AGENTS.md:23, 46` 误导新人**：写的是 `bun build`，但 `wedding-platform-admin/package.json:14` 的 `build` script 实际是 `next build`。`bun build` 是 Bun 自己的单文件二进制打包命令，跟这个项目的 Next.js 没关系。新人按文档跑会一脸懵。
  - **`scripts/test.sh:44` 的 CI 假绿**：`run_test "Admin Type Check" "$ADMIN_DIR" "bun run build 2>&1 | tail -5"`。`set -e` 在脚本顶部，但 `run_test` 内部用 `if eval "$cmd"` 跑命令，**已经吞掉了 `set -e` 的语义**；外加 `2>&1 | tail -5` 没有 `set -o pipefail`，于是 `bun run build` 失败时 `tail -5` 仍然成功退出，整个 `if` 走 PASS 分支。**字面意义上 CI 会报绿，但实际没 build 通过**。比"CI 不可见"严重得多。
  - **启动链路有未收紧的敏感点**：`wedding-platform-admin/src/instrumentation.ts:1` 在 dev 启动早期就 import `@sentry/nextjs`；如果本地缺 Sentry/OTel 相关环境变量或 peer dep，dev server 会直接挂掉。从"开箱即跑"的角度看，这条路没被充分防护。
- 缺口：
  - **-1.5** **Devex 三件套未对齐**（AGENTS.md 误导 + test.sh pipefail 缺失 + instrumentation 启动隐患）
  - **-1.0** **启动稳定性未收口**（instrumentation.ts / Sentry / OTel 模块解析）
  - **-0.5** 349 处 `any` 偏多
  - **-0.5** 无 E2E
  - **-0.5** 前端零测试
  - **-0.3** AI workbench controller 缺测试
  - **-0.2** 权限闭环（同 §3.9，这里只算工程影响）

---

## 4. 综合评分（加权）

| 模块 | 权重 | 得分 | 加权分 |
|---|---|---|---|
| CRM / 线索 | 12% | 7.5 | 0.90 |
| 合同 + 签字 | 8% | 6.0 | 0.48 |
| 项目管理 | 12% | 7.5 | 0.90 |
| 婚礼时间线 | 8% | 7.0 | 0.56 |
| **AI 视觉** | **16%** | **8.5** | **1.36** ⭐ |
| AI 文案 | 5% | 5.5 | 0.28 |
| **2D 设计器** | **10%** | **6.5** | **0.65** ⭐ |
| 通知中心 | 6% | 6.0 | 0.36 |
| 权限 / 多租户 | 8% | 7.5 | 0.60 |
| 流程模板 | 5% | 7.5 | 0.38 |
| 资产管理 | 4% | 7.0 | 0.28 |
| 物料管理 | 2% | 6.0 | 0.12 |
| 报表 | 2% | 4.0 | 0.08 |
| 工程质量 | 2% | 5.5 | 0.11 |
| **总分** | **100%** | — | **7.06 / 10** |

> 计算器：`0.90+0.48+0.90+0.56+1.36+0.28+0.65+0.36+0.60+0.38+0.28+0.12+0.08+0.11 = 7.06`

---

## 5. 优化路线图（按 ROI 排序）

### P0（3 个月内）—— 放大护城河 + 合同存证

| 序号 | 工作 | 估时 | 收益 |
|---|---|---|---|
| P0-1 | **合同 PDF 存证 + 短信验证签字** | 2 周 | ⭐⭐⭐⭐ |
| P0-2 | **接对象存储（OSS / COS）+ CDN + 缩略图** | 1 周 | ⭐⭐⭐⭐ |
| P0-3 | **SMS 真实通道接入（阿里云）** | 1 周 | ⭐⭐⭐⭐ |
| P0-4 | **AI Credits 轻量 quota 表**（替代被删的 TenantSubscription） | 0.5 周 | ⭐⭐⭐ |
| P0-5 | **权限闭环 + Devex 三件套收口**（见 §3.9 / §3.14 缺口） | 1 周 | ⭐⭐⭐⭐ |

### P1（3-6 个月）—— 放大 AI 护城河

| 序号 | 工作 | 估时 | 收益 |
|---|---|---|---|
| P1-1 | **AI 工作台 SSE 流式输出**（已有 RxJS 基础） | 1 周 | ⭐⭐⭐⭐ |
| P1-2 | **AI 案例库（团队/平台公共）+ 一键改稿** | 2 周 | ⭐⭐⭐⭐ |
| P1-3 | **轻量 PWA 现场模式**（替代被删的 mini app） | 3 周 | ⭐⭐⭐⭐ |
| P1-4 | **座位安排（Seating Chart）**：客人导入 + 拖拽 + AI 自动排 | 3 周 | ⭐⭐⭐⭐ |
| P1-5 | **文案生成流式 + 多版本对比** | 1 周 | ⭐⭐⭐ |
| P1-6 | **线索打分 + SLA 监控 + 自动分单** | 2 周 | ⭐⭐⭐ |
| P1-7 | **内置流程模板库**（5万/10万/豪华套餐 3 套） | 1 周 | ⭐⭐⭐ |

### P2（6-12 个月）—— 拉开身位

| 序号 | 工作 | 估时 | 收益 |
|---|---|---|---|
| P2-1 | **AI 智能推荐**（基于历史/合同金额/婚期推荐套餐） | 4 周 | ⭐⭐⭐⭐ |
| P2-2 | **场景设计器协作编辑 + 3D 预览** | 4 周 | ⭐⭐⭐⭐ |
| P2-3 | **任务依赖图 + 甘特图** | 2 周 | ⭐⭐⭐ |
| P2-4 | **客户复购 / 周年回访自动化** | 2 周 | ⭐⭐⭐⭐ |
| P2-5 | **婚礼物料 SaaS 模板市场**（UGC + 分润） | 4 周 | ⭐⭐⭐ |
| P2-6 | **AI 视频生成**（Sora / 可灵） | 3 周 | ⭐⭐⭐⭐ |

### P3（工程债务，持续做）

- 前端补 React Testing Library + Playwright E2E
- 减少 `any`，给 Prisma JSON 字段加 Zod runtime schema
- 权限 Redis 缓存
- 配置 CI/CD（GitHub Actions + 自动化 Prisma migration 验证）
- Sentry / OpenTelemetry 集成
- API 文档（OpenAPI / Swagger）

---

## 6. 决策记录

- **不进入 MVP**：在线画布 / 图层编辑 / PS 式二次编辑（与产品定位冲突）
- **不进入 MVP**：文字生成（誓词 / 致辞 / 社交文案）的精修
- **不进入产品**：财务模块 / 新人协作端 / 婚礼小程序 —— 战略收敛（已主动砍掉）
- **服务端文字合成优先 SVG / Sharp 而非 Puppeteer**（节省 50MB 镜像 + 资源）
- **AI Provider 仅保留 OpenAI 兼容 + ModelScope REST**（不恢复 Pollinations）
- **Phase 0-5 即 MVP 范围**，Phase 6+ 属于"可运营产品"

---

## 7. 关键代码定位（评审 / 修改入口）

### 后端核心

- `wedding-platform-api/src/ai-workbench/ai-workbench.service.ts`（967 行，最大）
- `wedding-platform-api/src/scenes/scene-ai.service.ts`（522 行）
- `wedding-platform-api/src/identity/identity.service.ts`（358 行）
- `wedding-platform-api/src/tasks/tasks.service.ts`（约 280 行）
- `wedding-platform-api/src/crm/leads.service.ts`（CRM 核心）
- `wedding-platform-api/src/contracts/contracts.service.ts`（合同 + 签字；保留 signToken 机制）
- `wedding-platform-api/src/projects/projects.service.ts`（项目 + 阶段 + 任务）
- `wedding-platform-api/src/ai-workbench/quota.service.ts`（配额，**需改为读轻量 quota 表**）
- `wedding-platform-api/src/ai-workbench/events/generation-events.service.ts`（事件总线，SSE 接入点）
- `wedding-platform-api/src/storage/object-storage.service.ts`（当前仅本地 fs）
- `wedding-platform-api/prisma/schema.prisma`（数据模型，单一源真）
- `wedding-platform-api/prisma/migrations/20260604_drop_finance_couple_mini/migration.sql`（删档迁移）

### 前端核心

- `wedding-platform-admin/src/app/studio/projects/[projectId]/page.tsx`（项目详情 / 双视图）
- `wedding-platform-admin/src/app/studio/projects/[projectId]/designer/page.tsx`（场景设计器入口）
- `wedding-platform-admin/src/app/studio/ai-workbench/page.tsx`（AI 工作台独立入口）
- `wedding-platform-admin/src/app/studio/ai-workbench/[projectId]/page.tsx`（AI 工作台项目内入口）
- `wedding-platform-admin/src/app/contract/[token]/sign/page.tsx`（**客户签字页**）
- `wedding-platform-admin/src/components/signature-pad.tsx`（**手写签名组件**）
- `wedding-platform-admin/src/features/ai-workbench/components/ai-workbench-view-page.tsx`（581 行）
- `wedding-platform-admin/src/components/kanban/KanbanBoard.tsx`（542 行）
- `wedding-platform-admin/src/features/editor/components/ai-panel.tsx`（503 行）
- `wedding-platform-admin/src/features/editor/store/scene-store.ts`（Zustand）
- `wedding-platform-admin/src/features/editor/lib/pixi-app.ts`（Pixi 引擎）
- `wedding-platform-admin/src/config/nav-config.ts`（动态导航）

### Devex 收紧点（与 §3.14 配套，落地清单见 §8）

- `wedding-platform-admin/package.json:14` —— `"build": "next build"`（AGENTS.md 文档应同步）
- `AGENTS.md:23, 46` —— `bun build` 误写
- `scripts/test.sh:2` —— `set -e`（被 `if eval` 吞掉）
- `scripts/test.sh:44` —— `bun run build 2>&1 | tail -5`（缺 `set -o pipefail`，build 失败被 tail 吃掉）
- `wedding-platform-admin/src/instrumentation.ts:1` —— `@sentry/nextjs` 顶层 import，启动链路敏感点
- `wedding-platform-admin/src/lib/auth/auth-client.ts:67, 100` —— `wedding-auth-me-invalidated` 事件定义 + dispatch
- `wedding-platform-admin/src/features/roles/api/queries.ts:43` / `menus/api/queries.ts:22` / `accounts/api/queries.ts:36` —— `notifyAuthMeInvalidated()` 调用方
- `wedding-platform-admin/src/lib/auth/auth-context.tsx:185` —— 缺监听（应补 `window.addEventListener('wedding-auth-me-invalidated', () => revalidate())`）

### 文档

- `落地清单.md`（9 阶段 MVP 计划）
- `ai工作台.md` / `aiai.md` / `ai婚策方案.md`（AI 需求原始文档）
- `DESIGN.md`（设计系统）
- `AGENTS.md` / `CLAUDE.md`（仓库根 + 子项目；**注意 AGENTS.md:23,46 写的是 `bun build`，但 admin 实际是 `next build`，见 §3.14**）

---

## 8. 后续动作建议

1. **应用删档迁移**：`cd wedding-platform-api && pnpm prisma migrate deploy`
2. **更新落地清单.md**：把 P0 从"财务 + 新人端 + 合同存证"改为"合同存证 + 对象存储 + SMS + 权限闭环 + Devex 收口"
3. **冻结范围**：P0 集中放大护城河（合同 + 存储 + SMS + 权限/Devex 收口），不与 P1 并行
4. **P1-1（AI SSE 流式）** 是性价比最高的"投资型"工作，可作为 P0 间的穿插
5. **Devex 三件套先收口**（避免新人踩坑）：
   - 修 `AGENTS.md:23,46`：`bun build` → `bun run build`（admin 的 `build` 已在 `package.json` 里定义为 `next build`）
   - 修 `scripts/test.sh:2`：加 `set -o pipefail`（或干脆在 `run_test` 里用 `${PIPESTATUS[0]}` 判失败），并把 `bun run build 2>&1 | tail -5` 改成 `bun run build` 让错误完整显示
   - 修 `wedding-platform-admin/src/instrumentation.ts:1`：把 `@sentry/nextjs` 改成 dynamic import，或用 `try { require(...) } catch {}` 兜底，避免缺 peer dep 时 dev server 直接挂
6. **权限闭环（P0 候选）**：在 `auth-context.tsx:185` 附近挂 `window.addEventListener('wedding-auth-me-invalidated', () => revalidate())`，让 roles/menus/accounts 变更后 sidebar 自动刷新；写一个对应的 e2e 守住这条路径
