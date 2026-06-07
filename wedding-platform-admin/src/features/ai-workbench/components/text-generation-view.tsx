'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  generateText,
  refineText,
  listTextGenerations,
  updateTextBookmark,
  deleteTextGeneration,
} from '../api/queries';
import type {
  AiTextGeneration,
  TextGenerationType,
  TextGenerationTypeConfig,
} from '../api/types';

const TEXT_TYPES: TextGenerationTypeConfig[] = [
  {
    id: 'vows',
    label: '誓词生成',
    description: '撰写真挚感人的婚礼誓词',
    placeholder: '例如：浪漫温馨的婚礼誓词，200字左右，表达对新娘的深情...',
  },
  {
    id: 'speech',
    label: '致辞生成',
    description: '撰写得体大方的婚礼致辞',
    placeholder: '例如：作为新郎父亲的致辞，温馨感人，3分钟左右...',
  },
  {
    id: 'social_copy',
    label: '社交媒体文案',
    description: '撰写适合社交平台的婚礼文案',
    placeholder: '例如：小红书风格的婚纱照配文，甜美可爱，带 emoji...',
  },
  {
    id: 'invitation',
    label: '婚礼请柬文案',
    description: '撰写优雅得体的请柬文案',
    placeholder: '例如：中式婚礼请柬文案，典雅庄重，包含时间和地点...',
  },
  {
    id: 'story',
    label: '婚礼故事',
    description: '撰写温馨浪漫的婚礼故事',
    placeholder: '例如：从相识到相爱的故事，适合在婚礼现场播放...',
  },
];

const STYLE_OPTIONS = [
  { value: 'romantic', label: '浪漫温馨' },
  { value: 'elegant', label: '典雅庄重' },
  { value: 'humorous', label: '幽默风趣' },
  { value: 'simple', label: '简约大方' },
  { value: 'literary', label: '文艺清新' },
  { value: 'traditional', label: '传统中式' },
  { value: 'modern', label: '现代时尚' },
];

export function TextGenerationView() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<TextGenerationType>('vows');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<AiTextGeneration | null>(null);
  const [refineFeedback, setRefineFeedback] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  const activeType = TEXT_TYPES.find((t) => t.id === selectedType)!;

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['text-generations', selectedType],
    queryFn: () => listTextGenerations({ type: selectedType, pageSize: 20 })
  });

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setCurrentResult(null);

    try {
      const result = await generateText({
        type: selectedType,
        prompt: prompt.trim(),
        style: style || undefined,
        language: 'zh',
      });
      setCurrentResult(result);
      void queryClient.invalidateQueries({ queryKey: ['text-generations'] });
      toast.success('文案生成成功');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedType, style, isGenerating, queryClient]);

  const handleRefine = useCallback(async () => {
    if (!currentResult || !refineFeedback.trim() || isRefining) return;

    setIsRefining(true);

    try {
      const refined = await refineText(currentResult.id, {
        feedback: refineFeedback.trim(),
        style: style || undefined,
      });
      setCurrentResult(refined);
      setRefineFeedback('');
      void queryClient.invalidateQueries({ queryKey: ['text-generations'] });
      toast.success('文案优化成功');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '优化失败，请重试');
    } finally {
      setIsRefining(false);
    }
  }, [currentResult, refineFeedback, style, isRefining, queryClient]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('已复制到剪贴板'),
      () => toast.error('复制失败'),
    );
  }, []);

  const handleBookmark = useCallback(
    async (item: AiTextGeneration) => {
      try {
        await updateTextBookmark(item.id, !item.isBookmarked);
        void queryClient.invalidateQueries({ queryKey: ['text-generations'] });
        if (currentResult?.id === item.id) {
          setCurrentResult({ ...currentResult, isBookmarked: !item.isBookmarked });
        }
        toast.success(item.isBookmarked ? '已取消收藏' : '已收藏');
      } catch {
        toast.error('操作失败');
      }
    },
    [currentResult, queryClient],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteTextGeneration(id);
        void queryClient.invalidateQueries({ queryKey: ['text-generations'] });
        if (currentResult?.id === id) setCurrentResult(null);
        toast.success('已删除');
      } catch {
        toast.error('删除失败');
      }
    },
    [currentResult, queryClient],
  );

  const handleLoadHistory = useCallback((item: AiTextGeneration) => {
    setCurrentResult(item);
    setPrompt(item.prompt);
    setSelectedType(item.type);
    if (item.style) setStyle(item.style);
    setActiveTab('create');
    toast.success('已载入历史记录');
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">AI 文案生成</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          选择文案类型，描述你的需求，AI 为你生成专业的婚礼文案
        </p>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1">
        {/* Left panel - Input */}
        <div className="w-1/2 border-r flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create' | 'history')} className="flex flex-col flex-1 min-h-0">
            <div className="border-b px-4">
              <TabsList>
                <TabsTrigger value="create">创建文案</TabsTrigger>
                <TabsTrigger value="history">历史记录</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="create" className="flex-1 overflow-auto p-4 space-y-4 m-0">
              {/* Type selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="text-type-group">
                  文案类型
                </label>
                <div
                  id="text-type-group"
                  role="group"
                  aria-labelledby="text-type-group"
                  className="grid grid-cols-2 gap-2"
                >
                  {TEXT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                        selectedType === type.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="font-medium">{type.label}</div>
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        {type.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="text-style">
                  风格 (可选)
                </label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger id="text-style">
                    <SelectValue placeholder="选择风格偏好" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prompt input */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="text-prompt">
                  描述你的需求
                </label>
                <Textarea
                  id="text-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={activeType.placeholder}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-muted-foreground text-xs">
                  尽量详细描述你的需求，包括风格、长度、场景等信息
                </p>
              </div>

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    生成中...
                  </>
                ) : (
                  '生成文案'
                )}
              </Button>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="space-y-2 p-4">
                  {isHistoryLoading ? (
                    <div className="text-muted-foreground py-8 text-center text-sm">
                      加载中...
                    </div>
                  ) : historyData?.items.length === 0 ? (
                    <div className="text-muted-foreground py-8 text-center text-sm">
                      暂无历史记录
                    </div>
                  ) : (
                    historyData?.items.map((item) => (
                      <Card
                        key={item.id}
                        className="cursor-pointer transition-colors hover:border-primary/30"
                        onClick={() => handleLoadHistory(item)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {TEXT_TYPES.find((t) => t.id === item.type)?.label ?? item.type}
                                </Badge>
                                {item.isBookmarked && (
                                  <span className="text-yellow-500 text-xs">★</span>
                                )}
                              </div>
                              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                                {item.prompt}
                              </p>
                            </div>
                            <div className="text-muted-foreground shrink-0 text-xs">
                              {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right panel - Output */}
        <div className="w-1/2 flex flex-col">
          {currentResult ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Result header */}
              <div className="border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {TEXT_TYPES.find((t) => t.id === currentResult.type)?.label ?? currentResult.type}
                  </Badge>
                  {currentResult.style && (
                    <Badge variant="outline">
                      {STYLE_OPTIONS.find((s) => s.value === currentResult.style)?.label ?? currentResult.style}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBookmark(currentResult)}
                  >
                    {currentResult.isBookmarked ? '★ 已收藏' : '☆ 收藏'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(currentResult.result)}
                  >
                    复制
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(currentResult.id)}
                  >
                    删除
                  </Button>
                </div>
              </div>

              {/* Result content */}
              <ScrollArea className="flex-1 p-4">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {currentResult.result}
                </div>
              </ScrollArea>

              {/* Refine section */}
              <div className="border-t p-4 space-y-2">
                <label className="text-sm font-medium" htmlFor="text-refine">
                  优化调整
                </label>
                <div className="flex gap-2">
                  <Textarea
                    id="text-refine"
                    value={refineFeedback}
                    onChange={(e) => setRefineFeedback(e.target.value)}
                    placeholder="描述你希望如何调整，例如：再简短一些、加入更多幽默元素..."
                    rows={2}
                    className="resize-none flex-1"
                  />
                  <Button
                    onClick={handleRefine}
                    disabled={!refineFeedback.trim() || isRefining}
                    className="self-end"
                  >
                    {isRefining ? '优化中...' : '优化'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="text-muted-foreground text-4xl mb-4">T</div>
                <h3 className="text-lg font-medium">AI 文案生成</h3>
                <p className="text-muted-foreground mt-1 text-sm max-w-sm">
                  选择文案类型，输入你的需求描述，AI 将为你生成专业的婚礼文案
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
