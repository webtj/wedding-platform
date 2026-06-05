/**
 * AI 能力维度枚举。
 * 按能力切接口，不按厂商。厂商适配器按需实现对应能力。
 */
export const AI_CAPABILITY = {
  TEXT2TEXT: 'text2text',
  IMAGE2TEXT: 'image2text',
  TEXT2IMAGE: 'text2image',
  IMAGE2IMAGE: 'image2image',
  TEXT2VIDEO: 'text2video'
} as const;

export type AiCapability = (typeof AI_CAPABILITY)[keyof typeof AI_CAPABILITY];
