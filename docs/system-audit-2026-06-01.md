# 系统清理审查（第二轮）

日期：2026-06-01  
范围：前端、后端、数据库、工程脚本、质量门禁

## 本轮已落地修改

### 1) 登录页交互范围收敛为静态（按最新产品要求）
- 保留：静态视觉背景（无鼠标开帘）
- 移除：`auth-hero` 动态渲染链路与依赖
  - 删除 `CurtainWebGLScene.tsx`、`CurtainCloth.ts`、`ParticleField.ts`、`capability.ts`、`SvgCurtainFallback.tsx`、`shaders/*`
  - `RomanticAuthHero` 仅渲染 `StaticHeroFallback`
  - `package.json` 移除 `three` / `@types/three`

### 2) 前端全局 a11y 债务（第一批）清理
- `src/components/sign-out-button.tsx`
  - `<span onClick>` 改为语义化 `<button type='button'>`，消除键盘不可达问题
- `src/components/organization-list.tsx`
  - 租户项由可点击 `div` 改为 `<button>`，补齐语义与键盘操作一致性
- `src/components/ui/input-group.tsx`
  - `InputGroupAddon` 增加 `role='button'` + `tabIndex={0}`，修复非交互元素事件告警

### 3) 启停脚本安全升级（避免误杀同机其它项目）
- `scripts/start.sh`
  - 新增 `.run/wedding-platform/*.pid` 进程跟踪
  - 启动前仅清理本项目旧 PID，不再默认杀掉端口上的未知进程
  - 端口被未知进程占用时，显式报错并退出
- `scripts/stop.sh`
  - 按 PID 文件精准停止 API/Admin
  - 自动清理无效 PID 文件
- `.gitignore`
  - 增加 `.run/`

### 4) 后端 AI 工作台类型约束加固（去宽类型）
- `wedding-platform-api/src/ai-workbench/ai-workbench.service.ts`
  - 引入 `Prisma` JSON 输入类型，替换多处 `as any`
  - 统一使用 `AI_GENERATION_STATUS` 常量，替代散落字符串状态
  - `where` 条件收敛为 `Prisma.AiGenerationWhereInput`

## 本轮检查结果

### 前端（admin）
- 命令：`bun run lint`
- 结论：**未通过（历史债较多）**
- 主要错误族：
  - `jsx-a11y(click-events-have-key-events)`
  - `jsx-a11y(no-static-element-interactions)`
  - `jsx-a11y(control-has-associated-label)`
  - `jsx-a11y(no-autofocus)`
  - `next(no-img-element)`
- 分布热点：
  - `src/app/studio/templates/page.tsx`
  - `src/app/studio/projects/[projectId]/edit/page.tsx`
  - `src/app/studio/materials/page.tsx`
  - `src/features/contracts/components/contracts-table/index.tsx`

### 后端（api）
- 命令：`pnpm lint`、`pnpm test`
- 结论：**通过**
  - `tsc --noEmit` 通过
  - `vitest`：`48 files / 106 tests` 通过

### 脚本
- 命令：`bash -n scripts/start.sh && bash -n scripts/stop.sh`
- 结论：通过

## 数据库与表结构审查（重点项）

### 观察到的结构风险（未在本轮直接迁移）
- `AiGeneration` 仍使用自由字符串字段：
  - `type String`
  - `status String`
  - `style String`
- 风险：
  - 枚举值漂移（尤其是跨服务写入）
  - 查询统计需额外兜底清洗

### 建议的 P1 迁移方案
1. 将 `AiGeneration.type/status` 迁移为 Prisma Enum。  
2. 为 `style` 增加受控字典或白名单层（先在 API 层约束，再视业务稳定度落库）。  
3. 对 `resultImageUrls` / `businessTags` 评估是否拆子表（若需要按元素检索/排序/统计，建议拆）。

## 下一步执行清单（按优先级）

### P0（建议立即执行）
1. 批量修复 `templates` / `project-edit` / `materials` 页面的 a11y 阻断错误。  
2. 清理 `no-autofocus` 与关键 `control-has-associated-label` 错误，恢复 `admin lint` 基线。

### P1（随后执行）
1. `AiGeneration` 枚举迁移（含 Prisma migration + API 兼容层 + 回填脚本）。  
2. 统一前端交互容器规范：禁用“可点击 div”，统一按钮/链接语义组件。  
3. 将脚本启动状态接入健康探针（例如 `/health`）和更明确的超时诊断输出。

### P2（持续治理）
1. 系统性收敛 `no-explicit-any`。  
2. 清理 unused imports/vars 与重复逻辑，降低维护噪音。  

