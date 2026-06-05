# 系统清理审查（第一轮）

日期：2026-05-31  
范围：前端、后端、数据库、脚本、测试链路

## 已落地修复

1. 修复共享契约测试回归（后端）
- 文件：`wedding-platform-api/packages/shared/src/platform.test.ts`
- 问题：`miniSessionSchema` 已要求 `tenantId`，测试样例未同步，导致根测试失败。
- 处理：补充 `tenantId` 字段与断言。
- 结果：`bun run test` 全量通过（API + Admin type check）。

2. 启停脚本风险降级（工程脚本）
- 文件：
  - `scripts/start.sh`
  - `scripts/stop.sh`
- 问题：原实现直接 `kill -9`，容易误伤端口占用进程且无优雅退出。
- 处理：先 `SIGTERM`，短轮询等待，再必要时 `SIGKILL` 兜底。
- 收益：降低开发机误杀风险，减少状态脏写和端口僵尸概率。

3. 登录页窗帘交互重构（前端）
- 文件：`wedding-platform-admin/src/features/auth-hero/CurtainWebGLScene.tsx`
- 处理：从“机械帘片”改为“闭合纱帘图层 + 打开目标图层”的自然过渡模型，并保留花瓣/光尘/风场。
- 状态：已完成编译与类型校验；仍需业务侧主观验收继续打磨参数。

4. 首批前端可访问性债务清理（P0 启动）
- 文件：`wedding-platform-admin/src/features/projects/components/projects-table/index.tsx`
- 处理：
  - 卡片容器补充键盘可达能力（`role='link' + tabIndex + Enter/Space`）。
  - 移除静态容器上的无语义点击拦截，改为按钮级别 `stopPropagation`。
  - 去除未使用变量。
- 结果：该文件的 `oxlint` 违规已清零（局部验证通过）。

## 当前高优先级问题（待继续清理）

### P0：Admin lint 存在系统性可访问性与交互语义问题
- 证据：`bun run lint` 失败，典型报错：
  - `jsx-a11y(click-events-have-key-events)`
  - `jsx-a11y(no-static-element-interactions)`
  - `jsx-a11y(control-has-associated-label)`
  - `next(no-img-element)`
- 影响：键盘可用性、可访问性合规、代码质量门禁。
- 建议顺序：
  1) 先修 `projects-table` / `contracts-table` / `studio/templates` 的交互语义错误；
  2) 再清理 `no-explicit-any` 与 `unused-vars`。

### P1：AI 生成核心表字段约束偏弱（数据库）
- 位置：`prisma/schema.prisma` 的 `AiGeneration`。
- 现状：`status/type/style` 使用自由字符串；`resultImageUrls/businessTags/size` 依赖 JSON。
- 风险：状态漂移、数据不一致、查询/统计成本上升。
- 建议：
  1) 将 `status`、`type` 迁移为 enum；
  2) `resultImageUrls` 拆为子表（或至少统一 schema + 约束）；
  3) 给高频查询字段补充复合索引评审（按业务查询日志校准）。

### P1：开发脚本与运行策略仍有可优化点
- 位置：`scripts/start.sh`
- 现状：通过端口探活，不区分是否为本项目实例。
- 风险：多项目并行开发时仍可能干扰。
- 建议：引入 PID 文件或 `tmux/foreman` 方案做进程隔离。

## 本轮验证结果

1. `wedding-platform-admin` 构建通过：
- `bun run build` ✅

2. 根测试通过：
- `bun run test` ✅

3. API 类型检查通过：
- `pnpm lint`（API）✅

4. Admin 全量 lint 仍未通过（历史债）：
- `bun run lint` ❌（需按上方 P0 批量清理）

## 下一轮执行计划（已排）

1. 继续打磨登录页窗帘交互参数，直到贴合“闭合图 -> 打开图”目标观感。  
2. 按 P0 文件清单逐一修复 a11y 语义错误并回归 `bun run lint`。  
3. 输出 AI 数据模型迁移草案（enum + 结构化结果表）与影响评估。  
4. 在不破坏现有业务前提下，分批清理 `any`、冗余逻辑与脚本隐患。  
