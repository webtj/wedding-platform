import type { AiCapability } from './capability';

// ── 公共类型 ────────────────────────────────────────────────────────────────

export interface ProviderConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ImageSize {
  width: number;
  height: number;
}

// ── Text2Text (LLM 对话) ───────────────────────────────────────────────────

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Text2TextInput {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface Text2TextOutput {
  content: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

export interface Text2TextProvider {
  readonly name: string;
  readonly capability: 'text2text';
  configure(config: ProviderConfig): void;
  chat(input: Text2TextInput): Promise<Text2TextOutput>;
  testConnection(): Promise<boolean>;
}

// ── Text2Image (文生图) ────────────────────────────────────────────────────

export interface Text2ImageInput {
  prompt: string;
  size: ImageSize;
  n?: number;
}

export interface Text2ImageOutput {
  images: string[];
  metadata?: Record<string, unknown>;
}

export interface Text2ImageProvider {
  readonly name: string;
  readonly capability: 'text2image';
  configure(config: ProviderConfig): void;
  generate(input: Text2ImageInput): Promise<Text2ImageOutput>;
  testConnection(): Promise<boolean>;
}

// ── Image2Image (图生图) ───────────────────────────────────────────────────

export interface Image2ImageInput {
  sourceImageUrl: string;
  prompt: string;
  size: ImageSize;
  n?: number;
}

export interface Image2ImageOutput {
  images: string[];
  metadata?: Record<string, unknown>;
}

export interface Image2ImageProvider {
  readonly name: string;
  readonly capability: 'image2image';
  configure(config: ProviderConfig): void;
  generateFromImage(input: Image2ImageInput): Promise<Image2ImageOutput>;
  testConnection(): Promise<boolean>;
}

// ── 联合类型 ────────────────────────────────────────────────────────────────

export type AiProvider =
  | Text2TextProvider
  | Text2ImageProvider
  | Image2ImageProvider;
