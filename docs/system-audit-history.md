# 系统清理审查历史

> 合并自 `system-audit-2026-05-31.md` + `system-audit-2026-06-01.md`（已归档）
> 状态：历史日志（所有遗留问题已在后续 fix）

---

## 第一轮 — 2026-05-31

**范围**：前端、后端、数据库、脚本、测试链路

### 已落地修复

1. **修复共享契约测试回归**（后端）
   - 文件：`wedding-platform-api/packages/shared/src/platform.test.ts`
   - 问题：`miniSessionSchema` 已要求 `tenantId`，测试样例未同步，导致根测试失败
   - 处理：补充 `tenantId` 字段与断言
   - 结果：`bun run test` 全量通过（API + Admin type check）

2. **启停脚本风险降级**（工程脚本）
   - 文件：`scripts/start.sh` + `scripts/stop.sh`
   - 问题：原 `kill -9` 容易误伤端口占用进程且无优雅退出
   - 处理：先 `SIGTERM`，短轮询等待，再 `SIGKILL` 兜底

3. **登录页窗帘交互重构**（前端）
   - 文件：`wedding-platform-admin/src/features/auth-hero/CurtainWebGLScene.tsx`
   - 处理：从"机械帘片"改为"闭合纱帘图层 + 打开目标图层"自然过渡

4. **首批前端可访问性债务清理**（P0 启动）
   - 文件：`wedding-platform-admin/src/features/projects/components/projects-table/index.tsx`
   - 处理：补充 `role='link' + tabIndex + Enter/Space`；按钮级 `stopPropagation`
   - 结果：该文件 `oxlint` 违规已清零

### 当轮验证结果

- ✅ `wedding-platform-admin` 构建通过
- ✅ 根测试 `bun run test` 通过
- ✅ API 类型检查 `pnpm lint` 通过
- ❌ Admin 全量 lint 未通过（历史债）

### 当轮高优问题（后续已修）

- **P0**：Admin lint 存在 a11y 语义问题（jsx-a11y × 4 类）
- **P1**：AI 生成核心表字段约束偏弱（`AiGeneration` 自由字符串）
- **P1**：开发脚本端口探活不区分本项目实例

---

## 第二轮 — 2026-06-01

**范围**：前端、后端、数据库、工程脚本、质量门禁

### 已落地修改

1. **登录页交互范围收敛为静态**（按产品要求）
   - 删除 `CurtainWebGLScene.tsx` / `CurtainCloth.ts` / `ParticleField.ts` / `shaders/*` 等动态渲染
   - `RomanticAuthHero` 仅渲染 `StaticHeroFallback`
   - `package.json` 移除 `three` / `@types/three`

2. **前端全局 a11y 债务（第一批）清理**
   - `sign-out-button.tsx`：`onClick span` → `<button type='button'>`
   - `organization-list.tsx`：可点击 `div` → `<button>`
   - `input-group.tsx`：`InputGroupAddon` 加 `role='button' + tabIndex`

3. **启停脚本安全升级**（避免误杀同机其它项目）
   - `start.sh`：新增 `.run/wedding-platform/*.pid` 进程跟踪
   - `stop.sh`：按 PID 文件精准停止 + 清理无效 PID
   - `.gitignore`：增加 `.run/`

4. **后端 AI 工作台类型约束加固**（去宽类型）
   - `ai-workbench.service.ts`：引入 `Prisma` JSON 输入类型替换 `as any`
   - 统一使用 `AI_GENERATION_STATUS` 常量
   - `where` 条件收敛为 `Prisma.AiGenerationWhereInput`

### 当轮检查结果

- ❌ **Admin lint 未通过**（历史债，主要 a11y）
- ✅ **API lint + test 通过**（48 files / 106 tests）

### 当轮观察的数据库结构风险（已在后续 fix）

- `AiGeneration.type/status` 仍用自由字符串（已迁 enum，见 `ai-workbench.service.ts` 现状）
- `resultImageUrls` / `businessTags` JSON 字段（保留，需评估拆子表）

---

## 后续追踪（v2 完结后）

这两轮 system-audit 暴露的所有 P0/P1 项均已在 **v2 完结**（见 `v2-wrap-up.md`）中修复：
- a11y 全局债务 → 0 errors（4 pre-existing warnings 保留）
- API lint 0 errors
- 启停脚本 PID 隔离已稳定运行
- AI 工作台类型约束完成
- 测试覆盖 596/596 pass

历史快照保留作为治理过程参考。
