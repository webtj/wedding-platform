# Wedding Platform

婚礼策划管理平台，包含管理后台（Admin）和后端 API 两个子项目。

## 项目结构

```
admin/
├── wedding-platform-admin/   # Next.js 16 管理后台 (React + shadcn/ui)
└── wedding-platform-api/     # NestJS 后端 API (Prisma + PostgreSQL)
```

## 技术栈

### 前端 (wedding-platform-admin)
- Next.js 16 + React 19
- shadcn/ui + Tailwind CSS 4
- TanStack Query + TanStack Form + TanStack Table
- Zustand 状态管理
- Clerk 认证（通过 shim 适配自定义认证）

### 后端 (wedding-platform-api)
- NestJS 11
- Prisma ORM + PostgreSQL
- JWT 认证
- Vitest 测试

## 快速开始

### 环境要求
- Node.js >= 18
- pnpm (API)
- bun (Admin)
- PostgreSQL

### 安装依赖

```bash
# API
cd wedding-platform-api
cp .env.example .env  # 配置数据库等
pnpm install
pnpm prisma:generate
pnpm prisma:migrate

# Admin
cd wedding-platform-admin
bun install
```

### 启动开发服务

```bash
# 同时启动前后端
cd wedding-platform-admin
bun start

# 或分别启动
cd wedding-platform-api && pnpm dev
cd wedding-platform-admin && bun dev
```

- Admin: http://localhost:3000
- API: http://localhost:4000

### 构建部署

```bash
# API
cd wedding-platform-api
pnpm build
pnpm start:prod

# Admin
cd wedding-platform-admin
bun build
bun start:prod
```

## 主要功能

- **客户管理 (CRM)**: 线索录入、跟进、转化
- **合同管理**: 合同创建、电子签名
- **项目管理**: 看板、阶段、任务、物料
- **财务管理**: 收支记录
- **模板系统**: 流程模板管理
- **权限控制**: 角色权限、多租户

## License

Private
