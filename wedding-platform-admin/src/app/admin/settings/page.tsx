'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { settingsQueryOptions, settingsKeys } from '@/features/settings/api/queries';
import { upsertSetting, testConnection } from '@/features/settings/api/service';
import type {
  PlatformSetting,
  AiServiceConfig,
  FeatureToggles,
  StorageConfig,
  QuotaConfig,
  SettingsFormData
} from '@/features/settings/api/types';

// Backend stores AI config under group 'ai':
//   ai.llm    -> AiServiceConfig (encrypted) — LLM 对话
//   ai.image  -> AiServiceConfig (encrypted) — 图片生成 (文生图 + 图生图共用)
//   ai.features -> FeatureToggles

const defaultFormData: SettingsFormData = {
  llm: {
    provider: 'openai',
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    enabled: true
  },
  image: {
    provider: 'openai',
    model: 'gpt-image-1',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    enabled: true
  },
  features: {
    text2img: true,
    img2img: true,
    psdExport: true
  },
  storage: {
    provider: 'local',
    retentionDays: 15,
    region: '',
    bucket: '',
    secretId: '',
    secretKey: ''
  },
  quota: {
    windowHours: 5,
    limit: 50
  }
};

type FieldDef = { key: string; label: string; placeholder: string; type?: string };

const storageFieldMap: Record<string, FieldDef[]> = {
  local: [],
  cos: [
    { key: 'region', label: '地域 (Region)', placeholder: 'ap-guangzhou' },
    { key: 'bucket', label: '存储桶 (Bucket)', placeholder: 'my-bucket-1250000000' },
    { key: 'secretId', label: 'SecretId', placeholder: 'AKIDxxxxxxxx' },
    { key: 'secretKey', label: 'SecretKey', placeholder: 'xxxxxxxx', type: 'password' }
  ],
  oss: [
    { key: 'region', label: '地域 (Endpoint)', placeholder: 'oss-cn-hangzhou.aliyuncs.com' },
    { key: 'bucket', label: '存储空间 (Bucket)', placeholder: 'my-bucket' },
    { key: 'accessKeyId', label: 'AccessKeyId', placeholder: 'LTAI4xxx' },
    { key: 'accessKeySecret', label: 'AccessKeySecret', placeholder: 'xxxxxxxx', type: 'password' }
  ]
};

const llmProviders = [
  { value: 'openai', label: 'OpenAI 兼容 (OpenAI / DeepSeek / 通义 / MiMo / 自定义)' }
];

const imageProviderDefaults: Record<string, Pick<AiServiceConfig, 'baseUrl' | 'model'>> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-image-1' },
  modelscope: { baseUrl: 'https://api-inference.modelscope.cn/v1', model: 'Qwen/Qwen-Image' }
};

const imageProviders = [
  { value: 'openai', label: 'OpenAI 兼容 (DALL·E / Flux / 通义万相)' },
  { value: 'modelscope', label: 'ModelScope (魔搭社区)' }
];

function parseSettings(settings: PlatformSetting[]): SettingsFormData {
  const valueMap = new Map(settings.map((s) => [s.key, s.value]));
  const defaultMap = new Map(settings.map((s) => [s.key, s.defaultValue]));

  const resolve = <T,>(key: string, fallback: T): T =>
    (valueMap.get(key) as T | undefined) ?? (defaultMap.get(key) as T | undefined) ?? fallback;

  const storage = resolve<StorageConfig>('storage.config', defaultFormData.storage);

  return {
    llm: { ...defaultFormData.llm, ...resolve<AiServiceConfig>('ai.llm', defaultFormData.llm) },
    image: { ...defaultFormData.image, ...resolve<AiServiceConfig>('ai.image', defaultFormData.image) },
    features: { ...defaultFormData.features, ...resolve<FeatureToggles>('ai.features', defaultFormData.features) },
    storage: { ...defaultFormData.storage, ...storage },
    quota: { ...defaultFormData.quota, ...resolve<QuotaConfig>('ai.quota', defaultFormData.quota) }
  };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<SettingsFormData>(defaultFormData);
  const [isDirty, setIsDirty] = useState(false);
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [showImgKey, setShowImgKey] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  const [testingImg, setTestingImg] = useState(false);

  const { data: settingsData } = useQuery({
    ...settingsQueryOptions(),
    placeholderData: []
  });

  useEffect(() => {
    if (settingsData && settingsData.length > 0) {
      setFormData(parseSettings(settingsData));
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      await Promise.all([
        upsertSetting('ai', 'llm', {
          value: data.llm, label: 'LLM 对话', encrypted: true,
          defaultValue: defaultFormData.llm
        }),
        upsertSetting('ai', 'image', {
          value: data.image, label: '图片生成', encrypted: true,
          defaultValue: defaultFormData.image
        }),
        upsertSetting('ai', 'features', {
          value: data.features, label: '功能开关',
          defaultValue: defaultFormData.features
        }),
        upsertSetting('ai', 'quota', {
          value: data.quota, label: '生成配额',
          defaultValue: defaultFormData.quota
        }),
        upsertSetting('storage', 'config', {
          value: data.storage, label: '存储配置', encrypted: true,
          defaultValue: defaultFormData.storage
        })
      ]);
    },
    onSuccess: () => {
      toast.success('设置已保存');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
    onError: (err: Error) => {
      toast.error(err.message || '保存失败，请稍后重试');
    }
  });

  const handleTestConnection = useCallback(
    async (type: 'llm' | 'image') => {
      const config = formData[type];
      if (!config.baseUrl || !config.model || !config.apiKey) {
        toast.error('请填写 Base URL、API Key 和 Model');
        return;
      }
      const setTesting = type === 'llm' ? setTestingLlm : setTestingImg;
      setTesting(true);
      try {
        const res = await testConnection({
          provider: config.provider,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model
        });
        if (res.success) {
          toast.success(`${type === 'llm' ? 'LLM' : '图片生成'} 服务连接成功`);
        } else {
          toast.error(res.message || '连接失败，请检查配置');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '连接失败，请检查配置');
      } finally {
        setTesting(false);
      }
    },
    [formData]
  );

  const updateConfig = useCallback((section: 'llm' | 'image', field: keyof AiServiceConfig, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    setIsDirty(true);
  }, []);

  const updateImageProvider = useCallback((v: string) => {
    setFormData((prev) => {
      const def = imageProviderDefaults[v];
      const next = { ...prev.image, provider: v, ...def };
      return { ...prev, image: next };
    });
    setIsDirty(true);
  }, []);

  const updateFeature = useCallback((field: keyof FeatureToggles, value: boolean) => {
    setFormData((prev) => ({ ...prev, features: { ...prev.features, [field]: value } }));
    setIsDirty(true);
  }, []);

  const updateStorage = useCallback((field: keyof StorageConfig, value: string | number) => {
    setFormData((prev) => ({ ...prev, storage: { ...prev.storage, [field]: value } }));
    setIsDirty(true);
  }, []);

  const updateQuota = useCallback((field: keyof QuotaConfig, value: number) => {
    setFormData((prev) => ({ ...prev, quota: { ...prev.quota, [field]: value } }));
    setIsDirty(true);
  }, []);

  const handleReset = useCallback(() => {
    const fromDb = settingsData && settingsData.length > 0 ? parseSettings(settingsData) : defaultFormData;
    // For each section, reset value to DB-stored default, keeping current value as fallback
    setFormData({
      llm: { ...defaultFormData.llm, ...(fromDb.llm ? { provider: fromDb.llm.provider, model: fromDb.llm.model, baseUrl: fromDb.llm.baseUrl, apiKey: '', enabled: true } : {}) },
      image: { ...defaultFormData.image, ...(fromDb.image ? { provider: fromDb.image.provider, model: fromDb.image.model, baseUrl: fromDb.image.baseUrl, apiKey: '', enabled: true } : {}) },
      features: { ...defaultFormData.features, ...fromDb.features },
      storage: { ...defaultFormData.storage },
      quota: { ...defaultFormData.quota, ...fromDb.quota }
    });
    setIsDirty(true);
    toast.success('已恢复默认值（API Key 已清空，请重新填写）');
  }, [settingsData]);

  const storageFields = useMemo(
    () => storageFieldMap[formData.storage.provider] ?? [],
    [formData.storage.provider]
  );

  const featureItems = useMemo(
    () => [
      {
        key: 'text2img' as const,
        label: '文生图',
        description: '通过 AI 文字描述自动生成婚礼场景效果图，支持自定义风格与尺寸'
      },
      {
        key: 'img2img' as const,
        label: '图生图',
        description: '基于已有图片进行风格迁移与局部修改，快速生成设计方案变体。需配置 OpenAI 兼容或 ModelScope'
      },
      {
        key: 'psdExport' as const,
        label: 'PSD 导出',
        description: '将设计稿导出为分层 PSD 文件，方便设计师在 Photoshop 中进行精细调整'
      }
    ],
    []
  );

  const renderAiCard = (
    section: 'llm' | 'image',
    title: string,
    description: string,
    providers: Array<{ value: string; label: string }>,
    isTesting: boolean,
    showKey: boolean,
    setShowKey: (v: boolean) => void
  ) => {
    const config = formData[section];
    return (
      <Card>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <div className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg'>
              <Icons.sparkles className='size-5' />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor={`${section}-provider`}>Provider</Label>
              <Select value={config.provider} onValueChange={section === 'image' ? updateImageProvider : (v) => updateConfig('llm', 'provider', v)}>
                <SelectTrigger id={`${section}-provider`} className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor={`${section}-model`}>Model 名称</Label>
              <Input
                id={`${section}-model`}
                value={config.model}
                onChange={(e) => updateConfig(section, 'model', e.target.value)}
                placeholder={section === 'llm' ? '例如 deepseek-chat / mimo-v2.5' : '例如 flux / dall-e-3'}
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor={`${section}-base-url`}>Base URL</Label>
            <Input
              id={`${section}-base-url`}
              value={config.baseUrl}
              onChange={(e) => updateConfig(section, 'baseUrl', e.target.value)}
              placeholder='https://api.example.com'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor={`${section}-api-key`}>API Key</Label>
            <div className='flex gap-2'>
              <Input
                id={`${section}-api-key`}
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => updateConfig(section, 'apiKey', e.target.value)}
                placeholder='sk-...'
                className='flex-1'
              />
              <Button
                type='button'
                variant='outline'
                size='icon'
                onClick={() => setShowKey(!showKey)}
                aria-label='切换密钥可见性'
              >
                {showKey ? <Icons.eyeOff className='size-4' /> : <Icons.eye className='size-4' />}
              </Button>
            </div>
            <p className='text-muted-foreground text-xs'>密钥经 AES-256 加密后存储于服务端</p>
          </div>
          <div className='flex items-center justify-between border-t pt-4'>
            <div className='flex items-center gap-3'>
              <Switch checked={config.enabled} onCheckedChange={(v) => updateConfig(section, 'enabled', v)} />
              <span className='text-sm font-semibold'>启用{title}</span>
            </div>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => handleTestConnection(section)}
              disabled={isTesting}
            >
              {isTesting ? <Icons.spinner className='size-4 animate-spin' /> : <Icons.check className='size-4' />}
              测试连接
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PageContainer pageTitle='通用设置' pageDescription='管理平台 AI 服务、功能开关与存储配置'>
      <div className='flex flex-col gap-6'>
        {/* LLM */}
        {renderAiCard(
          'llm',
          'LLM 对话',
          '大语言模型配置，用于扩写专业绘图 Prompt。Base URL 无需包含 /v1',
          llmProviders,
          testingLlm,
          showLlmKey,
          setShowLlmKey
        )}

        {/* Image Generation */}
        {renderAiCard(
          'image',
          '图片生成',
          '文生图与图生图共用同一模型配置，仅支持 OpenAI 兼容协议与 ModelScope RESTful 接口',
          imageProviders,
          testingImg,
          showImgKey,
          setShowImgKey
        )}

        {/* Quota Config */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <div className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg'>
                <Icons.adjustments className='size-5' />
              </div>
              <div>
                <CardTitle>生成配额</CardTitle>
                <CardDescription>每用户在指定滚动时间窗口内的最大生成次数</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='quota-window'>时间窗口（小时）</Label>
                <Input
                  id='quota-window'
                  type='number'
                  min={1}
                  max={168}
                  value={formData.quota.windowHours}
                  onChange={(e) => updateQuota('windowHours', Number(e.target.value))}
                  placeholder='5'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='quota-limit'>窗口内最大生成次数</Label>
                <Input
                  id='quota-limit'
                  type='number'
                  min={1}
                  max={10000}
                  value={formData.quota.limit}
                  onChange={(e) => updateQuota('limit', Number(e.target.value))}
                  placeholder='50'
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <div className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg'>
                <Icons.adjustments className='size-5' />
              </div>
              <div>
                <CardTitle>功能开关</CardTitle>
                <CardDescription>控制平台核心 AI 功能的启用与停用</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='divide-y'>
              {featureItems.map((item) => (
                <div key={item.key} className='flex items-center justify-between py-4 first:pt-0 last:pb-0'>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-semibold'>{item.label}</p>
                    <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>{item.description}</p>
                  </div>
                  <Switch
                    className='ml-4 shrink-0'
                    checked={formData.features[item.key]}
                    onCheckedChange={(v) => updateFeature(item.key, v)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Storage Config */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <div className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg'>
                <Icons.product className='size-5' />
              </div>
              <div>
                <CardTitle>存储配置</CardTitle>
                <CardDescription>配置文件存储服务与资源清理策略</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='storage-provider'>Storage Provider</Label>
                <Select value={formData.storage.provider} onValueChange={(v) => updateStorage('provider', v)}>
                  <SelectTrigger id='storage-provider' className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='local'>本地存储</SelectItem>
                    <SelectItem value='cos'>腾讯云 COS</SelectItem>
                    <SelectItem value='oss'>阿里云 OSS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='retention-days'>资源保留天数</Label>
                <Input
                  id='retention-days'
                  type='number'
                  min={1}
                  max={365}
                  value={formData.storage.retentionDays}
                  onChange={(e) => updateStorage('retentionDays', Number(e.target.value))}
                  placeholder='15'
                />
              </div>
            </div>

            {formData.storage.provider === 'local' ? (
              <p className='text-muted-foreground py-2 text-sm'>本地存储无需额外配置，文件将保存在服务器磁盘。</p>
            ) : (
              storageFields.length > 0 && (
                <div className='grid gap-4 sm:grid-cols-2'>
                  {storageFields.map((field) => (
                    <div key={field.key} className='space-y-2'>
                      <Label htmlFor={`storage-${field.key}`}>{field.label}</Label>
                      <Input
                        id={`storage-${field.key}`}
                        type={field.type ?? 'text'}
                        value={(formData.storage[field.key as keyof StorageConfig] as string) ?? ''}
                        onChange={(e) => updateStorage(field.key as keyof StorageConfig, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Sticky Save Bar */}
        <div className='bg-background/80 sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-3 border-t px-4 py-3 backdrop-blur-sm md:-mx-6 md:px-6'>
          {isDirty && <span className='text-muted-foreground mr-auto text-xs'>有未保存的更改</span>}
          <Button type='button' variant='ghost' onClick={handleReset}>
            重置
          </Button>
          <Button
            type='button'
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending}
            isLoading={saveMutation.isPending}
          >
            <Icons.check className='size-4' />
            保存设置
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
