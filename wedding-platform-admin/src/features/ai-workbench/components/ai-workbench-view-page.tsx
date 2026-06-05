'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  getMaterialTypes,
  downloadImage,
  deleteGeneration,
  listGenerations,
  getAiTemplates,
  updateGenerationBookmark,
  selectImage as selectImageApi,
  bookmarkImage as bookmarkImageApi,
  listConversations,
  createConversation,
} from '../api/queries';
import { useGeneration } from '../hooks/use-generation';
import { MODE_TABS, QUICK_PROMPTS, STYLES, type WorkbenchMode } from '../constants';
import { Composer } from './composer';
import type { ChatMessage, AiMessage } from './message-bubble';
import { WorkbenchShell } from './workbench-shell';
import { EmptyWorkbench } from './empty-workbench';
import { ConversationThread } from './conversation-thread';
import { GenerationHistoryPanel } from './generation-history-panel';
import type { AiGeneration, AiReferenceAsset, GeneratePayload, MaterialType, RefinePayload, SeriesGeneratePayload } from '../api/types';

let msgSeq = 0;
function nextId() {
  msgSeq += 1;
  return `m${Date.now()}_${msgSeq}`;
}

interface AiWorkbenchViewPageProps {
  projectId?: string;
}

export default function AiWorkbenchViewPage({ projectId }: AiWorkbenchViewPageProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<WorkbenchMode>('image');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 600, height: 900 });
  const [style, setStyle] = useState(STYLES[0].id);
  const [count, setCount] = useState(4);

  const [referenceAssets, setReferenceAssets] = useState<AiReferenceAsset[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastRequestRef = useRef<{ prompt: string } | null>(null);

  const { isGenerating, generateImages, refineImages, generateSeriesImages, cancel } =
    useGeneration();

  const { data: materialData } = useQuery({
    queryKey: ['ai-workbench-material-types'],
    queryFn: getMaterialTypes,
    staleTime: 5 * 60 * 1000,
  });

  const { data: generationHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['ai-workbench-generations', 'recent', projectId],
    queryFn: () => listGenerations({ page: 1, pageSize: 12, projectId }),
    staleTime: 30 * 1000,
  });

  const { data: imageTemplates } = useQuery({
    queryKey: ['ai-workbench-templates', 'image_design'],
    queryFn: () => getAiTemplates('image_design'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: conversationsData, isLoading: isConversationsLoading } = useQuery({
    queryKey: ['ai-workbench-conversations', projectId],
    queryFn: () => listConversations({ projectId }),
    staleTime: 30 * 1000,
  });

  const materialTypes = materialData?.items ?? [];
  const quickPrompts =
    imageTemplates && imageTemplates.length > 0
      ? imageTemplates.map((template) => ({
          label: template.name,
          prompt: template.prompt,
        }))
      : QUICK_PROMPTS.map((prompt) => ({ label: prompt, prompt }));

  useEffect(() => {
    if (selectedTypeId || materialTypes.length === 0) return;
    const first = materialTypes[0];
    setSelectedTypeId(first.id);
    if (first.defaultSize) setSize(first.defaultSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialData, selectedTypeId]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const selectedType = materialTypes.find((m) => m.id === selectedTypeId);
  const activeMode = MODE_TABS.find((t) => t.mode === mode)!;
  const isChat = messages.length > 0;

  const handleSelectType = useCallback((m: MaterialType) => {
    setSelectedTypeId(m.id);
    if (m.defaultSize) setSize(m.defaultSize);
  }, []);

  const handleReferenceUploaded = useCallback((asset: AiReferenceAsset) => {
    setReferenceAssets((prev) => [...prev, asset]);
  }, []);

  const handleRemoveReference = useCallback((id: string) => {
    setReferenceAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateAiMessage = useCallback((id: string, patch: Partial<AiMessage>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id && m.role === 'ai' ? { ...m, ...patch } : m)),
    );
  }, []);

  const runGeneration = useCallback(
    async (text: string, starter: () => Promise<AiGeneration>, materialName: string) => {
      const aiId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'user', text, materialName, size, style },
        { id: aiId, role: 'ai', status: 'thinking', count },
      ]);
      scrollToBottom();

      try {
        const gen = await starter();
        if (gen.status === 'failed') {
          updateAiMessage(aiId, {
            status: 'done',
            generation: gen,
            text: gen.errorMessage || '生成失败',
          });
        } else {
          updateAiMessage(aiId, { status: 'done', generation: gen });
        }
        if (gen.conversationId) setCurrentConversationId(gen.conversationId);
        void queryClient.invalidateQueries({ queryKey: ['ai-workbench-generations'] });
      } catch (err) {
        updateAiMessage(aiId, {
          status: 'done',
          text: err instanceof Error ? err.message : '生成失败',
        });
        toast.error(err instanceof Error ? err.message : '生成失败');
      } finally {
        scrollToBottom();
      }
    },
    [size, style, count, scrollToBottom, updateAiMessage, queryClient],
  );

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || isGenerating) return;
      if (!selectedType) {
        toast.error('请先选择物料类型');
        return;
      }
      if (!activeMode.available) {
        return;
      }

      setInput('');
      lastRequestRef.current = { prompt: text };

      // Create conversation if none exists
      let conversationId = currentConversationId;
      if (!conversationId) {
        try {
          const convo = await createConversation({ projectId: projectId ?? undefined, title: text.slice(0, 50) });
          conversationId = convo.id;
          setCurrentConversationId(conversationId);
          void queryClient.invalidateQueries({ queryKey: ['ai-workbench-conversations'] });
        } catch {
          toast.error('创建对话失败');
          return;
        }
      }

      const refMode = referenceAssets.length > 0
        ? ((referenceAssets[0]?.role as 'style' | 'subject' | 'pet') ?? 'style')
        : undefined;
      const generationType = refMode === 'subject' || refMode === 'pet' ? 'img2img' : 'text2img';

      const payload: GeneratePayload = {
        materialTypeId: selectedType.id,
        projectId: projectId ?? undefined,
        conversationId: conversationId ?? undefined,
        type: generationType,
        prompt: text,
        style,
        size,
        count,
        ...(referenceAssets.length > 0 && {
          referenceAssetIds: referenceAssets.map((a) => a.id),
          referenceMode: refMode,
        }),
      };
      void runGeneration(text, () => generateImages(payload), selectedType.name);
    },
    [input, isGenerating, selectedType, currentConversationId, activeMode, style, size, count, generateImages, runGeneration, projectId, queryClient, referenceAssets],
  );

  const handleRefine = useCallback(
    (sourceGen: AiGeneration | undefined, feedback: string) => {
      if (isGenerating) return;
      if (!sourceGen) {
        handleSend(feedback);
        return;
      }
      const payload: RefinePayload = { generationId: sourceGen.id, feedback, count };
      void runGeneration(feedback, () => refineImages(payload), selectedType?.name ?? '微调');
    },
    [isGenerating, count, refineImages, runGeneration, selectedType, handleSend],
  );

  const handleGenerateSeries = useCallback(
    (sourceGen: AiGeneration, instruction: string) => {
      if (isGenerating) return;
      if (!selectedTypeId) {
        toast.error('请先选择目标物料类型');
        return;
      }

      const payload: SeriesGeneratePayload = {
        generationId: sourceGen.id,
        targetMaterialTypeId: selectedTypeId,
        instruction,
        count,
      };
      void runGeneration(
        instruction,
        () => generateSeriesImages(payload),
        selectedType?.name ?? '同系列物料',
      );
    },
    [isGenerating, selectedTypeId, selectedType, count, generateSeriesImages, runGeneration],
  );

  const handleRegenerate = useCallback(() => {
    const last = lastRequestRef.current;
    if (last) handleSend(last.prompt);
  }, [handleSend]);

  const handleDownloadOne = useCallback((gen: AiGeneration, index: number) => {
    void downloadImage(gen.id, index, `wedding-v${index + 1}.png`).catch((err) =>
      toast.error(err instanceof Error ? err.message : '下载失败'),
    );
  }, []);

  const handleDownloadAll = useCallback(async (gen: AiGeneration) => {
    const urls = gen.resultImageUrls ?? (gen.resultImageUrl ? [gen.resultImageUrl] : []);
    if (urls.length === 0) return;
    toast.info(`开始下载 ${urls.length} 张图片`);
    for (let i = 0; i < urls.length; i++) {
      try {
        await downloadImage(gen.id, i, `wedding-v${i + 1}.png`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `第 ${i + 1} 张下载失败`);
      }
    }
  }, []);

  const handleBookmark = useCallback(
    async (generation: AiGeneration) => {
      try {
        const updated = await updateGenerationBookmark(generation.id, {
          isBookmarked: !generation.isBookmarked,
          businessTags: generation.isBookmarked ? [] : ['灵感收藏'],
        });

        setMessages((prev) =>
          prev.map((message) =>
            message.role === 'ai' && message.generation?.id === generation.id
              ? { ...message, generation: updated }
              : message,
          ),
        );

        await queryClient.invalidateQueries({ queryKey: ['ai-workbench-generations'] });
        toast.success(updated.isBookmarked ? '已收藏为灵感' : '已取消收藏');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '收藏失败');
      }
    },
    [queryClient],
  );

  const handleDeleteGeneration = useCallback(
    async (id: string) => {
      try {
        await deleteGeneration(id);
        await queryClient.invalidateQueries({ queryKey: ['ai-workbench-generations'] });
        toast.success('已删除');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '删除失败');
      }
    },
    [queryClient],
  );

  const handleImageSelect = useCallback(
    async (generationId: string, imageId: string) => {
      try {
        const _updatedImage = await selectImageApi(imageId);
        setMessages((prev) =>
          prev.map((message) => {
            if (message.role !== 'ai' || message.generation?.id !== generationId) return message;
            const gen = message.generation!;
            const updatedImages = (gen.images ?? []).map((img) =>
              img.id === imageId
                ? { ...img, isSelected: true }
                : { ...img, isSelected: false }
            );
            return {
              ...message,
              generation: { ...gen, images: updatedImages },
            };
          }),
        );
        toast.success('已选为当前图片');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '选择失败');
      }
    },
    [],
  );

  const handleImageBookmark = useCallback(
    async (generationId: string, imageId: string, isBookmarked: boolean) => {
      try {
        const updatedImage = await bookmarkImageApi(imageId, isBookmarked);
        setMessages((prev) =>
          prev.map((message) => {
            if (message.role !== 'ai' || message.generation?.id !== generationId) return message;
            const gen = message.generation!;
            const updatedImages = (gen.images ?? []).map((img) =>
              img.id === imageId ? { ...img, isBookmarked: updatedImage.isBookmarked } : img
            );
            return {
              ...message,
              generation: { ...gen, images: updatedImages },
            };
          }),
        );
        toast.success(updatedImage.isBookmarked ? '已收藏该图片' : '已取消收藏');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '收藏失败');
      }
    },
    [],
  );

  const newConversation = useCallback(() => {
    setMessages([]);
    setInput('');
    setCurrentConversationId(null);
    lastRequestRef.current = null;
    setReferenceAssets([]);
  }, []);

  const loadGeneration = useCallback(
    async (generation: AiGeneration) => {
      try {
        const conversationId = generation.conversationId;
        const records = conversationId
          ? await listGenerations({
              conversationId,
              page: 1,
              pageSize: 60,
              ...(projectId ? { projectId } : {}),
            })
          : null;
        const ordered = records ? records.items.toReversed() : [generation];
        const convoMessages: ChatMessage[] = ordered.flatMap((item) => [
          {
            id: nextId(),
            role: 'user',
            text: item.prompt,
            materialName: item.materialType?.name ?? '历史生成',
            size: item.size,
            style: item.style,
          },
          {
            id: nextId(),
            role: 'ai',
            status: 'done',
            count: item.resultImageUrls?.length ?? (item.resultImageUrl ? 1 : 0),
            generation: item,
          },
        ]);
        const latest = ordered[ordered.length - 1] ?? generation;

        setSelectedTypeId(latest.materialTypeId);
        setSize(latest.size);
        setStyle(latest.style);
        setMessages(convoMessages);
        setCurrentConversationId(latest.conversationId ?? null);
        lastRequestRef.current = { prompt: latest.prompt };
        setInput('');
        toast.success('已载入会话记录，可以继续描述调整');
        scrollToBottom();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '加载会话失败');
      }
    },
    [scrollToBottom, projectId],
  );

  const loadConversation = useCallback(
    async (conversationId: string) => {
      try {
        const records = await listGenerations({
          conversationId,
          page: 1,
          pageSize: 60,
          ...(projectId ? { projectId } : {}),
        });
        if (!records.items.length) {
          toast.info('该对话暂无生成记录');
          return;
        }
        const ordered = records.items.toReversed();
        const convoMessages: ChatMessage[] = ordered.flatMap((item) => [
          {
            id: nextId(),
            role: 'user' as const,
            text: item.prompt,
            materialName: item.materialType?.name ?? '历史生成',
            size: item.size,
            style: item.style,
          },
          {
            id: nextId(),
            role: 'ai' as const,
            status: 'done' as const,
            count: item.resultImageUrls?.length ?? (item.resultImageUrl ? 1 : 0),
            generation: item,
          },
        ]);
        const latest = ordered[ordered.length - 1];

        setSelectedTypeId(latest.materialTypeId);
        setSize(latest.size);
        setStyle(latest.style);
        setMessages(convoMessages);
        setCurrentConversationId(conversationId);
        lastRequestRef.current = { prompt: latest.prompt };
        setInput('');
        toast.success('已载入对话记录，可以继续描述调整');
        scrollToBottom();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '加载对话失败');
      }
    },
    [scrollToBottom, projectId],
  );

  return (
    <WorkbenchShell
      rightPanel={
        <GenerationHistoryPanel
          items={generationHistory?.items ?? []}
          loading={isHistoryLoading}
          onPreview={setPreviewUrl}
          onDownload={handleDownloadOne}
          onLoad={loadGeneration}
          onDelete={handleDeleteGeneration}
          onNewConversation={newConversation}
          conversations={conversationsData ?? []}
          conversationsLoading={isConversationsLoading}
          onLoadConversation={loadConversation}
          activeConversationId={currentConversationId}
        />
      }
    >
      {isChat ? (
        <>
          <ConversationThread
            messages={messages}
            scrollRef={scrollRef}
            onPreview={setPreviewUrl}
            onRefine={handleRefine}
            onRegenerate={handleRegenerate}
            onDownloadAll={handleDownloadAll}
            onDownloadOne={handleDownloadOne}
            onBookmark={handleBookmark}
            onGenerateSeries={handleGenerateSeries}
            onImageSelect={handleImageSelect}
            onImageBookmark={handleImageBookmark}
          />
          <div className='from-muted/20 shrink-0 bg-gradient-to-t to-transparent px-4 pt-3 pb-5'>
            <div className='mx-auto max-w-3xl'>
              <Composer
                value={input}
                onChange={setInput}
                onSend={() => handleSend()}
                onCancel={cancel}
                isGenerating={isGenerating}
                disabled={isGenerating}
                placeholder='继续描述或微调...'
                materialTypes={materialTypes}
                promptTemplates={imageTemplates}
                selectedTypeId={selectedTypeId}
                size={size}
                style={style}
                count={count}
                onSelectType={handleSelectType}
                onChangeSize={setSize}
                onChangeStyle={setStyle}
                onChangeCount={setCount}
                onReferenceUploaded={handleReferenceUploaded}
                referenceAssets={referenceAssets}
                onRemoveReference={handleRemoveReference}
              />
            </div>
          </div>
        </>
      ) : (
        <EmptyWorkbench
          mode={mode}
          onModeChange={setMode}
          input={input}
          onInputChange={setInput}
          onSend={() => handleSend()}
          onCancel={cancel}
          isGenerating={isGenerating}
          activePlaceholder={activeMode.placeholder}
          materialTypes={materialTypes}
          promptTemplates={imageTemplates}
          selectedTypeId={selectedTypeId}
          size={size}
          style={style}
          count={count}
          onSelectType={handleSelectType}
          onChangeSize={setSize}
          onChangeStyle={setStyle}
          onChangeCount={setCount}
          quickPrompts={quickPrompts}
          onQuickPrompt={handleSend}
          onReferenceUploaded={handleReferenceUploaded}
          referenceAssets={referenceAssets}
          onRemoveReference={handleRemoveReference}
        />
      )}

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className='max-w-3xl border-0 bg-transparent p-0 shadow-none'>
          <DialogTitle className='sr-only'>图片预览</DialogTitle>
          {previewUrl && (
            <div className='relative aspect-[3/4] max-h-[80vh] w-full'>
              <Image
                src={previewUrl}
                alt='预览'
                fill
                unoptimized
                className='rounded-lg object-contain'
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </WorkbenchShell>
  );
}
