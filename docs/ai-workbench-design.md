# AI 工作台技术方案

## 一、项目概述

### 1.1 目标

为婚礼策划 SaaS 平台构建 AI 工作台，实现：
- 物料智能制作（誓言卡、餐卡、贴纸、桌布等）
- 文生图 + 图生图能力
- 表单 + 对话混合交互
- 输出 PNG + PSD 格式

### 1.2 核心能力

| 能力 | 说明 |
|------|------|
| 文生图 | 用户输入文字描述 → AI 生成背景图 |
| 图生图 | 用户上传素材 → AI 风格化处理 |
| 对话微调 | 用户用文字描述调整需求 → AI 重新生成 |
| 多格式输出 | PNG（预览/分享）+ PSD（专业编辑） |

---

## 二、通用设置模块（超级管理员）

### 2.1 功能说明

在超级管理员后台新增"通用设置"页面，用于管理全局配置。

### 2.2 配置项

```typescript
// 配置分类
interface PlatformSettings {
  // AI 服务配置
  ai: {
    // LLM 配置
    llm: {
      provider: 'openai' | 'deepseek' | 'qwen' | 'custom';
      baseUrl: string;
      apiKey: string;
      model: string;
      enabled: boolean;
    };
    // 图片生成配置
    image: {
      provider: 'flux' | 'gpt-image' | 'tongyi' | 'custom';
      baseUrl: string;
      apiKey: string;
      model: string;
      enabled: boolean;
    };
    // 通用开关
    features: {
      text2img: boolean;    // 文生图开关
      img2img: boolean;     // 图生图开关
      psdExport: boolean;   // PSD 导出开关
    };
  };
  // 存储配置
  storage: {
    provider: 'local' | 'cos' | 'oss';
    // ... 存储相关配置
  };
}
```

### 2.3 数据库设计

```prisma
model PlatformSetting {
  id        String   @id @default(cuid())
  group     String   // 配置分组：ai, storage, etc.
  key       String   // 配置键
  value     Json     // 配置值（支持复杂对象）
  encrypted Boolean  @default(false) // 是否加密存储
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([group, key])
  @@map("platform_settings")
}
```

### 2.4 API 设计

```typescript
// 获取配置
GET /api/super-admin/settings
GET /api/super-admin/settings/:group

// 更新配置
PUT /api/super-admin/settings/:group/:key
PUT /api/super-admin/settings/:group (批量更新)

// 测试连接
POST /api/super-admin/settings/ai/test-connection
```

### 2.5 前端页面

```
超级管理员
└── 通用设置
    ├── AI 配置
    │   ├── LLM 设置（Provider、URL、Key、Model）
    │   ├── 图片生成设置（Provider、URL、Key、Model）
    │   └── 功能开关（文生图、图生图、PSD 导出）
    ├── 存储设置
    │   └── 存储 Provider 配置
    └── 测试工具
        └── 连接测试
```

---

## 三、AI 工作台模块

### 3.1 功能架构

```
AI 工作台
├── 誓言卡
├── 餐卡
├── 手卡
├── 桌卡
├── 照片墙
├── 贴纸
├── 桌布
├── 扇子封面
├── 自定义物料...
└── + 新增物料类型
```

### 3.2 核心流程

```
选物料类型（或自定义）
    ↓
选尺寸（预设 / 自定义）
    ↓
选风格（法式复古 / 中式 / 简约 / ...）
    ↓
输入内容
├── 文生图：文字描述需求
└── 图生图：上传素材 + 描述需求
    ↓
读取通用设置中的 AI 配置
    ↓
LLM 扩写 Prompt（将用户输入转为 AI 可理解的描述）
    ↓
调用图片生成 API
    ↓
返回结果
├── 成功 → 预览 → 下载 PNG / PSD
└── 失败 → 错误提示 → 重试
```

### 3.3 交互设计

**表单区（左侧）：**
- 物料类型选择（预设 + 自定义）
- 尺寸选择（预设 + 自定义输入）
- 风格选择（标签式）
- 文字输入（新娘名字、桌号等）
- 上传素材（图生图）

**预览区（右侧）：**
- AI 生成的图片预览
- 下载按钮（PNG / PSD）

**对话区（底部）：**
- 用户输入调整需求
- AI 理解后重新生成

---

## 四、技术架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (Next.js)                        │
├─────────────────────────────────────────────────────────────┤
│  超级管理员/通用设置  │  AI 工作台页面  │  物料类型管理      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        后端 (NestJS)                         │
├─────────────────────────────────────────────────────────────┤
│  SettingsModule  │  AIModule  │  MaterialModule  │  Export  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI 服务适配层                           │
├─────────────────────────────────────────────────────────────┤
│  LLM Service (Prompt 扩写)  │  Image Service (图片生成)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI 服务提供商                           │
├─────────────────────────────────────────────────────────────┤
│  硅基流动 (Flux)  │  通义万相  │  GPT Image 2  │  DeepSeek  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 模块划分

```
wedding-platform-api/src/
├── settings/                    # 通用设置模块
│   ├── settings.module.ts
│   ├── settings.service.ts      # 配置读写
│   ├── settings.controller.ts   # 超级管理员 API
│   └── dto/
├── ai/                          # AI 核心模块
│   ├── ai.module.ts
│   ├── ai.service.ts            # AI 业务逻辑
│   ├── ai.controller.ts         # AI API
│   ├── llm/                     # LLM 服务
│   │   ├── llm.service.ts       # Prompt 扩写
│   │   └── llm.adapter.ts       # 适配器接口
│   ├── image/                   # 图片生成服务
│   │   ├── image.service.ts     # 图片生成
│   │   └── image.adapter.ts     # 适配器接口
│   ├── providers/               # AI 服务提供商
│   │   ├── openai.provider.ts
│   │   ├── flux.provider.ts
│   │   ├── tongyi.provider.ts
│   │   └── deepseek.provider.ts
│   └── dto/
├── material/                    # 物料模块
│   ├── material.module.ts
│   ├── material-type.service.ts # 物料类型管理
│   ├── material-type.controller.ts
│   └── dto/
└── export/                      # 导出模块
    ├── export.module.ts
    ├── png.service.ts           # PNG 导出
    └── psd.service.ts           # PSD 导出
```

---

## 五、数据模型

### 5.1 新增表

```prisma
// 平台配置表
model PlatformSetting {
  id        String   @id @default(cuid())
  group     String   // 配置分组
  key       String   // 配置键
  value     Json     // 配置值
  encrypted Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([group, key])
  @@map("platform_settings")
}

// 物料类型表
model MaterialType {
  id          String   @id @default(cuid())
  name        String   // 物料名称
  code        String   // 物料代码（唯一标识）
  icon        String?  // 图标
  defaultSize Json?    // 默认尺寸 {width, height}
  isSystem    Boolean  @default(false) // 是否系统预设
  tenantId    String?  // 自定义类型归属租户
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, code])
  @@map("material_types")
}

// AI 生成记录表
model AiGeneration {
  id               String   @id @default(cuid())
  tenantId         String
  userId           String
  materialTypeId   String
  type             String   // text2img / img2img
  prompt           String   // 用户输入的原始描述
  aiPrompt         String   // LLM 扩写后的 Prompt
  style            String   // 风格
  size             Json     // 尺寸 {width, height}
  sourceImageUrl   String?  // 图生图的原图
  resultImageUrl   String?  // 生成的图片 URL
  resultPsdUrl     String?  // PSD 文件 URL
  status           String   // pending / processing / completed / failed
  errorMessage     String?
  metadata         Json?    // 扩展信息（模型、耗时、成本等）
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  materialType MaterialType @relation(fields: [materialTypeId], references: [id])

  @@index([tenantId, status])
  @@map("ai_generations")
}
```

### 5.2 复用现有表

- `AiJob` — 异步任务队列
- `AiTemplate` — 风格模板
- `AiOutput` — 输出文件

---

## 六、API 设计

### 6.1 通用设置 API

```typescript
// 获取配置
GET /api/super-admin/settings
GET /api/super-admin/settings/:group

// 更新配置
PUT /api/super-admin/settings/:group/:key
Body: { value: any }

// 批量更新
PUT /api/super-admin/settings/:group
Body: { [key: string]: any }

// 测试 AI 连接
POST /api/super-admin/settings/ai/test-connection
Body: { provider: string, baseUrl: string, apiKey: string, model: string }
```

### 6.2 物料类型 API

```typescript
// 获取物料类型列表
GET /api/material-types
Query: { includeSystem?: boolean }

// 创建自定义物料类型
POST /api/material-types
Body: { name, code, defaultSize?, icon? }

// 更新物料类型
PUT /api/material-types/:id

// 删除物料类型（仅自定义）
DELETE /api/material-types/:id
```

### 6.3 AI 生成 API

```typescript
// 文生图
POST /api/ai/generate
Body: {
  materialTypeId: string,
  prompt: string,
  style: string,
  size: { width: number, height: number }
}

// 图生图
POST /api/ai/generate
Body: {
  materialTypeId: string,
  type: 'img2img',
  sourceImage: File,
  prompt: string,
  style: string,
  size: { width: number, height: number }
}

// 对话微调
POST /api/ai/refine
Body: {
  generationId: string,
  feedback: string
}

// 获取生成历史
GET /api/ai/generations
Query: { materialTypeId?, status?, page?, pageSize? }

// 下载 PNG
GET /api/ai/generations/:id/png

// 下载 PSD
GET /api/ai/generations/:id/psd
```

---

## 七、AI 服务适配层

### 7.1 策略模式

```typescript
// 适配器接口
interface ImageProvider {
  name: string;
  generate(prompt: string, size: ImageSize): Promise<ImageResult>;
  img2img(source: Buffer, prompt: string, size: ImageSize): Promise<ImageResult>;
  testConnection(): Promise<boolean>;
}

// 工厂函数
function createImageProvider(settings: AiSettings): ImageProvider {
  switch (settings.image.provider) {
    case 'flux':
      return new FluxProvider(settings.image);
    case 'gpt-image':
      return new GptImageProvider(settings.image);
    case 'tongyi':
      return new TongyiProvider(settings.image);
    default:
      throw new Error(`Unknown provider: ${settings.image.provider}`);
  }
}
```

### 7.2 统一调用

```typescript
@Injectable()
export class ImageService {
  constructor(private readonly settingsService: SettingsService) {}

  async generate(input: GenerateImageInput): Promise<GenerateImageResult> {
    // 1. 读取配置
    const settings = await this.settingsService.getGroup('ai');

    // 2. 检查功能开关
    if (!settings.features.text2img) {
      throw new ForbiddenException('Text2img feature is disabled');
    }

    // 3. 创建 provider
    const provider = createImageProvider(settings);

    // 4. 调用生成
    const result = await provider.generate(input.prompt, input.size);

    // 5. 保存记录
    await this.saveGeneration(input, result);

    return result;
  }
}
```

---

## 八、异步任务机制

### 8.1 为什么需要异步

AI 生成图片耗时 5-15 秒，同步等待会：
- 网关超时
- 用户体验差
- 无法并发处理

### 8.2 异步流程

```
用户点击"生成"
    ↓
前端显示 loading + 进度条
    ↓
后端创建任务（status: pending）
    ↓
任务入队（BullMQ）
    ↓
Worker 消费任务
    ├── 调用 LLM 扩写 Prompt
    ├── 调用图片生成 API
    ├── 保存结果到 COS/OSS
    └── 更新任务状态（completed / failed）
    ↓
前端轮询或 WebSocket 推送
    ├── 成功 → 显示预览
    └── 失败 → 显示错误
```

### 8.3 前端交互

```typescript
// 轮询方式（简单）
const pollStatus = async (taskId: string) => {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/ai/tasks/${taskId}`);
    const task = await res.json();
    
    if (task.status === 'completed') {
      clearInterval(interval);
      showPreview(task.resultUrl);
    } else if (task.status === 'failed') {
      clearInterval(interval);
      showError(task.errorMessage);
    } else {
      updateProgress(task.progress);
    }
  }, 1000); // 每秒轮询
};

// WebSocket 方式（实时）
socket.on('ai:task:completed', (data) => {
  showPreview(data.resultUrl);
});
```

### 8.4 状态机

```
pending → processing → completed
                   ↘ failed → retry (最多 3 次)
```

---

## 九、用量限制（订阅机制）

### 9.1 限制策略

类似 Claude Code / Codex 的订阅模式：

| 维度 | 限制 | 重置规则 |
|------|------|----------|
| 5 小时 | N 次生成 | 滚动重置（从第一次使用开始计时） |
| 每周 | M 次生成 | 固定周期重置（周一 0 点） |

### 9.2 数据模型

```prisma
// 用量记录表
model AiUsageRecord {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  action    String   // generate / refine
  metadata  Json?    // 模型、耗时等
  createdAt DateTime @default(now())

  @@index([tenantId, userId, createdAt])
  @@map("ai_usage_records")
}
```

### 9.3 限制检查逻辑

```typescript
@Injectable()
export class AiQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async checkQuota(tenantId: string, userId: string): Promise<void> {
    // 1. 获取订阅配置
    const subscription = await this.getSubscription(tenantId);
    const { hourlyLimit, weeklyLimit } = subscription.aiQuota;

    // 2. 检查 5 小时限制
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const hourlyUsage = await this.prisma.aiUsageRecord.count({
      where: {
        tenantId,
        userId,
        createdAt: { gte: fiveHoursAgo }
      }
    });

    if (hourlyUsage >= hourlyLimit) {
      throw new ForbiddenException('AI 用量已达 5 小时限制，请稍后再试');
    }

    // 3. 检查每周限制
    const weekStart = this.getWeekStart();
    const weeklyUsage = await this.prisma.aiUsageRecord.count({
      where: {
        tenantId,
        userId,
        createdAt: { gte: weekStart }
      }
    });

    if (weeklyUsage >= weeklyLimit) {
      throw new ForbiddenException('AI 用量已达本周限制');
    }
  }

  async recordUsage(tenantId: string, userId: string, action: string, metadata?: any) {
    await this.prisma.aiUsageRecord.create({
      data: { tenantId, userId, action, metadata }
    });
  }

  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  }
}
```

### 9.4 前端显示

```typescript
// 显示剩余用量
const QuotaDisplay = () => {
  const { data: quota } = useQuery({
    queryKey: ['ai-quota'],
    queryFn: () => apiClient('/ai/quota')
  });

  return (
    <div className="text-sm text-muted-foreground">
      今日剩余：{quota.hourlyRemaining} 次 | 本周剩余：{quota.weeklyRemaining} 次
    </div>
  );
};
```

---

## 十、Prompt 模板

### 10.1 LLM 扩写 Prompt

将用户简单输入扩写为专业的图片生成 Prompt：

```typescript
const SYSTEM_PROMPT = `你是一位资深婚礼美学设计师和 AI 图片生成专家。

你的任务是将用户的简单需求扩写为高质量的图片生成 Prompt。

规则：
1. 输出纯英文 Prompt，不要中文
2. 描述要具体、专业、有画面感
3. 包含：风格、元素、色彩、构图、光影、质感
4. 结尾加：4k high-definition, micro-shot
5. 根据尺寸调整比例：--ar 2:3（竖版）/ --ar 3:2（横版）/ --ar 1:1（方形）
6. 不要包含文字描述（AI 生图容易写错字）

示例输入：法式复古风格的誓言卡，新娘名字李梅
示例输出：
"A luxury, minimalist French retro wedding vow card background, 
botanical oil painting texture, pure white roses, sage green leaves, 
blank space in the center for text overlay, soft golden hour lighting, 
vintage paper texture, elegant and romantic atmosphere, 
4k high-definition, micro-shot --ar 2:3"`;
```

### 10.2 风格模板

```typescript
const STYLE_TEMPLATES = {
  french_retro: {
    name: '法式复古',
    prompt: 'French retro style, botanical oil painting texture, vintage paper, soft golden lighting'
  },
  chinese_traditional: {
    name: '中式传统',
    prompt: 'Chinese traditional style, red and gold color scheme, auspicious patterns, silk texture'
  },
  minimalist: {
    name: '简约现代',
    prompt: 'Minimalist modern style, clean lines, white space, subtle gradients, elegant typography'
  },
  rustic: {
    name: '田园风',
    prompt: 'Rustic country style, natural materials, burlap texture, wildflowers, warm earth tones'
  },
  luxury: {
    name: '奢华',
    prompt: 'Luxury style, gold accents, crystal elements, rich velvet texture, dramatic lighting'
  }
};
```

### 10.3 物料类型 Prompt

```typescript
const MATERIAL_PROMPTS = {
  vow_card: {
    name: '誓言卡',
    basePrompt: 'wedding vow card background, romantic and elegant, blank center for text'
  },
  table_card: {
    name: '餐卡',
    basePrompt: 'wedding table place card, small format, elegant design, space for name and number'
  },
  sticker: {
    name: '贴纸',
    basePrompt: 'wedding sticker design, die-cut style, transparent background feel, cute and festive'
  },
  tablecloth: {
    name: '桌布',
    basePrompt: 'wedding tablecloth pattern, seamless tileable design, elegant and subtle'
  }
};
```

---

## 十一、实施计划

### Phase 1：通用设置模块（1 周）

- [ ] 数据库：PlatformSetting 表
- [ ] 后端：SettingsModule（CRUD + 加密存储）
- [ ] 前端：通用设置页面（AI 配置、存储配置）
- [ ] 测试：连接测试功能

### Phase 2：物料类型管理（3 天）

- [ ] 数据库：MaterialType 表
- [ ] 后端：MaterialTypeModule（CRUD）
- [ ] 前端：物料类型管理页面
- [ ] 预设数据：系统预设物料类型

### Phase 3：AI 核心服务（1.5 周）

- [ ] AI 适配层：策略模式 + 工厂函数
- [ ] LLM 服务：Prompt 扩写
- [ ] 图片生成服务：文生图 + 图生图
- [ ] 服务提供商：OpenAI、Flux、通义万相

### Phase 4：AI 工作台前端（1 周）

- [ ] AI 工作台页面布局
- [ ] 表单组件（物料类型、尺寸、风格）
- [ ] 预览组件
- [ ] 对话组件

### Phase 5：导出功能（3 天）

- [ ] PNG 导出
- [ ] PSD 导出（ag-psd）
- [ ] 下载 API

### Phase 6：测试优化（3 天）

- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能优化
- [ ] 错误处理

---

## 九、技术选型

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 16 | 已有 |
| UI 组件 | shadcn/ui | 已有 |
| 后端框架 | NestJS 11 | 已有 |
| 数据库 | PostgreSQL + Prisma | 已有 |
| AI SDK | OpenAI SDK | 统一调用接口 |
| PSD 导出 | ag-psd | 生成 PSD 文件 |
| 异步队列 | BullMQ | AI 任务队列 |

---

## 十、风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| AI 服务不稳定 | 生成失败 | 重试机制 + 多 provider 切换 |
| 生成耗时长 | 用户体验差 | 异步队列 + 进度提示 |
| 成本超支 | 费用过高 | 用量统计 + 配额限制 |
| 图片质量差 | 用户不满意 | 多模型对比 + 人工审核 |

---

## 十一、后续迭代

- Phase 7：批量生成
- Phase 8：模板库
- Phase 9：素材库（@引用）
- Phase 10：AI 对话式策划方案生成
