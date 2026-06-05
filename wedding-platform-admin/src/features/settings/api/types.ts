export type PlatformSetting = {
  key: string;
  group: string;
  label: string;
  value: unknown;
  defaultValue?: unknown;
};

export type AiServiceConfig = {
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
};

export type FeatureToggles = {
  text2img: boolean;
  img2img: boolean;
  psdExport: boolean;
};

export type StorageConfig = {
  provider: string;
  retentionDays: number;
  region?: string;
  bucket?: string;
  secretId?: string;
  secretKey?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
};

export type QuotaConfig = {
  windowHours: number;
  limit: number;
};

export type SettingsFormData = {
  llm: AiServiceConfig;
  image: AiServiceConfig;
  features: FeatureToggles;
  storage: StorageConfig;
  quota: QuotaConfig;
};
