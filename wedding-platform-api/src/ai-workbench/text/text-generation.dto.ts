import { z } from 'zod';

export const TEXT_GENERATION_TYPES = [
  'vows',
  'speech',
  'social_copy',
  'invitation',
  'story',
] as const;

export type TextGenerationType = (typeof TEXT_GENERATION_TYPES)[number];

export const aiTextGenerateSchema = z.object({
  type: z.enum(TEXT_GENERATION_TYPES),
  prompt: z.string().min(1).max(2000),
  style: z.string().max(100).optional(),
  language: z.string().max(10).default('zh'),
  projectId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AiTextGenerateDto = typeof aiTextGenerateSchema._type;

export const aiTextRefineSchema = z.object({
  feedback: z.string().min(1).max(2000),
  style: z.string().max(100).optional(),
});

export type AiTextRefineDto = typeof aiTextRefineSchema._type;

export const aiTextGenerationQuerySchema = z.object({
  type: z.enum(TEXT_GENERATION_TYPES).optional(),
  projectId: z.string().optional(),
  isBookmarked: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export type AiTextGenerationQueryDto = typeof aiTextGenerationQuerySchema._type;

export const aiTextBookmarkSchema = z.object({
  isBookmarked: z.boolean(),
});

export type AiTextBookmarkDto = typeof aiTextBookmarkSchema._type;

export const TEXT_GENERATION_PROMPTS: Record<TextGenerationType, { system: string; label: string }> = {
  vows: {
    label: '誓词生成',
    system: `你是一位专业的婚礼誓词撰写专家。请根据用户的需求，撰写真挚感人的婚礼誓词。

要求：
1. 语言真挚、感人、浪漫
2. 符合婚礼场景的庄重氛围
3. 结构清晰，有开头、主体和结尾
4. 适当使用修辞手法，但不过度华丽
5. 根据用户要求的风格和长度调整
6. 使用中文撰写（除非用户特别要求其他语言）`,
  },
  speech: {
    label: '致辞生成',
    system: `你是一位专业的婚礼致辞撰写专家。请根据用户的需求，撰写得体大方的婚礼致辞。

要求：
1. 语言得体、大方、温暖
2. 根据致辞人身份（新人、父母、伴郎伴娘、司仪等）调整语气
3. 结构清晰，有开场白、主体内容和祝福结尾
4. 适当加入幽默元素，但保持庄重
5. 根据用户要求的风格和长度调整
6. 使用中文撰写（除非用户特别要求其他语言）`,
  },
  social_copy: {
    label: '社交媒体文案',
    system: `你是一位专业的婚礼社交媒体文案撰写专家。请根据用户的需求，撰写适合社交媒体发布的婚礼文案。

要求：
1. 语言简洁、时尚、有感染力
2. 适合小红书、朋友圈、抖音等平台风格
3. 可适当使用 emoji 表情增加趣味性
4. 包含合适的标签建议
5. 根据用户要求的风格和长度调整
6. 使用中文撰写（除非用户特别要求其他语言）`,
  },
  invitation: {
    label: '婚礼请柬文案',
    system: `你是一位专业的婚礼请柬文案撰写专家。请根据用户的需求，撰写优雅得体的婚礼请柬文案。

要求：
1. 语言优雅、庄重、温馨
2. 包含必要的信息元素（新人姓名、日期、地点等的占位提示）
3. 符合请柬的格式规范
4. 可提供正式版和创意版两种风格
5. 根据用户要求的风格和长度调整
6. 使用中文撰写（除非用户特别要求其他语言）`,
  },
  story: {
    label: '婚礼故事',
    system: `你是一位专业的婚礼故事撰写专家。请根据用户的需求，撰写温馨浪漫的婚礼故事。

要求：
1. 语言优美、细腻、有画面感
2. 按照时间线或主题线索展开叙述
3. 注重细节描写和情感表达
4. 适合用于婚礼现场展示、纪念册或社交媒体分享
5. 根据用户要求的风格和长度调整
6. 使用中文撰写（除非用户特别要求其他语言）`,
  },
};
