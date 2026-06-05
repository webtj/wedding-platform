import { Injectable, Logger } from "@nestjs/common";
import { AppError } from "../common/errors/app-error";
import { randomUUID } from "crypto";
import { MessageRole, type Prisma } from "@prisma/client";
import { AI_GENERATION_STATUS } from "@wedding/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ObjectStorageService } from "../storage/object-storage.service";
import { SettingsService } from "../settings/settings.service";
import { LlmService } from "./llm/llm.service";
import { ImageService } from "./image/image.service";
import { QuotaService } from "./quota.service";
import { ConversationService } from "./conversation.service";
import { IntentParserService, type ParsedIntent } from "./intent/intent-parser.service";
import { PromptPlannerService } from "./prompt/prompt-planner.service";
import { DesignStateService, type DesignState } from "./state/design-state.service";
import { ResultComposerService, type TextOverlay } from "./composer/result-composer.service";
import { SvgTemplateService } from "./composer/svg-template.service";
import { AiReferenceAssetService } from "./assets/ai-reference-asset.service";
import { GenerationEventsService } from "./events/generation-events.service";
import type {
  AiGenerateDto,
  AiRefineDto,
  AiGenerationQueryDto,
  AiGenerationBookmarkDto,
  AiSeriesGenerateDto,
  AiComposeTextDto,
  AiGenerationFeedbackDto,
} from "./dto";

@Injectable()
export class AiWorkbenchService {
  private readonly logger = new Logger(AiWorkbenchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly imageService: ImageService,
    private readonly quotaService: QuotaService,
    private readonly conversationService: ConversationService,
    private readonly intentParserService: IntentParserService,
    private readonly promptPlannerService: PromptPlannerService,
    private readonly designStateService: DesignStateService,
    private readonly resultComposer: ResultComposerService,
    private readonly svgTemplateService: SvgTemplateService,
    private readonly objectStorage: ObjectStorageService,
    private readonly referenceAssetService: AiReferenceAssetService,
    private readonly settingsService: SettingsService,
    private readonly eventsService: GenerationEventsService,
  ) {}

  // ── Fire-and-forget safe wrapper ─────────────────────────────────────
  private handleAsyncGeneration(genId: string, tenantId: string, promise: Promise<void>) {
    promise.catch(async (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Generation ${genId} failed: ${msg.slice(0, 200)}`);
      this.eventsService.emitFailed(genId, tenantId, msg);
      try {
        await this.markGenerationFailed(genId, err);
      } catch (dbErr) {
        this.logger.error(`CRITICAL: Failed to mark generation ${genId} as failed: ${dbErr}`);
      }
    });
  }

  private static toJsonSize(size: { width: number; height: number }): Prisma.InputJsonValue {
    return size as unknown as Prisma.InputJsonValue;
  }

  // ── Generate ────────────────────────────────────────────────────────────

  async generate(tenantId: string, userId: string, data: AiGenerateDto) {
    await this.quotaService.checkQuota(tenantId, userId);

    const materialType = await this.assertMaterialAccessible(data.materialTypeId, tenantId);
    const conversationId = await this.resolveConversationId(
      tenantId,
      userId,
      data.conversationId,
      data.projectId,
    );

    // Resolve reference assets if provided
    let referenceAssetUrls: string[] = [];
    let resolvedSourceImageUrl = data.sourceImageUrl;
    let effectiveType = data.type;
    if (data.referenceAssetIds && data.referenceAssetIds.length > 0) {
      try {
        const assets = await this.prisma.aiReferenceAsset.findMany({
          where: { id: { in: data.referenceAssetIds }, tenantId },
        });
        referenceAssetUrls = assets.map((a) => a.url);
        // For subject/pet mode, use the first reference asset as the source image for img2img
        if (
          (data.referenceMode === "subject" || data.referenceMode === "pet") &&
          referenceAssetUrls.length > 0 &&
          !resolvedSourceImageUrl
        ) {
          resolvedSourceImageUrl = referenceAssetUrls[0];
          effectiveType = "img2img";
        }
      } catch (err) {
        this.logger.warn(`Reference asset resolution skipped: ${err}`);
      }
    }

    // Parse user intent — uses fallback on failure
    let parsedIntent: ParsedIntent;
    try {
      parsedIntent = await this.intentParserService.parseIntent(data.prompt);
    } catch (err) {
      this.logger.warn(`Intent parsing failed, using fallback: ${err}`);
      parsedIntent = {
        intent: 'CREATE_NEW_IMAGE',
        confidence: 0.5,
        operations: [],
        preserveRules: {},
      };
    }

    // Build structured prompt via PromptPlanner
    let structuredPrompt: string | undefined;
    try {
      structuredPrompt = this.promptPlannerService.buildPrompt({
        intent: parsedIntent,
        materialType: materialType.code,
        projectStyle: data.style,
        userRequest: data.prompt,
        preserveRules: parsedIntent.preserveRules,
      });
    } catch (err) {
      this.logger.warn(`Prompt planning failed, will use raw prompt: ${err}`);
    }

    // Update design state for this conversation
    try {
      const currentState = await this.getDesignState(conversationId, tenantId);
      const updatedState = this.designStateService.updateState(currentState, {
        currentMaterialType: materialType.code,
        currentStyle: data.style ? [data.style] : undefined,
        preserveRules: parsedIntent.preserveRules,
      });
      await this.conversationService.updateDesignState(conversationId, tenantId, updatedState);
    } catch (err) {
      this.logger.warn(`Design state update skipped: ${err}`);
    }

    // Merge reference asset metadata into generation metadata
    const generationMetadata: Record<string, unknown> = {};
    generationMetadata.parsedIntent = parsedIntent;
    if (data.referenceAssetIds && data.referenceAssetIds.length > 0) {
      generationMetadata.referenceAssetIds = data.referenceAssetIds;
      generationMetadata.referenceMode = data.referenceMode;
      generationMetadata.referenceAssetUrls = referenceAssetUrls;
    }

    // For style mode, augment the prompt with reference image context instead of img2img
    let effectivePrompt = data.prompt;
    if (data.referenceMode === "style" && referenceAssetUrls.length > 0) {
      const refDesc = referenceAssetUrls
        .map((_, i) => `参考图${i + 1}`)
        .join("、");
      effectivePrompt = `${data.prompt}\n\n[风格参考: 请参考上传的${refDesc}的视觉风格、色调和构图来生成图片]`;
    }

    // Override type and sourceImageUrl in the data for downstream processing
    const effectiveData: AiGenerateDto = {
      ...data,
      type: effectiveType,
      prompt: effectivePrompt,
      sourceImageUrl: resolvedSourceImageUrl,
    };

    const generation = await this.prisma.aiGeneration.create({
      data: {
        tenantId,
        userId,
        conversationId,
        projectId: data.projectId ?? null,
        materialTypeId: data.materialTypeId,
        type: effectiveType,
        prompt: data.prompt,
        aiPrompt: "",
        style: data.style,
        size: AiWorkbenchService.toJsonSize(data.size),
        sourceImageUrl: resolvedSourceImageUrl,
        status: AI_GENERATION_STATUS.PROCESSING,
        metadata: Object.keys(generationMetadata).length > 0
          ? (generationMetadata as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });

    // Record user message in the conversation
    await this.conversationService.addMessage(
      conversationId,
      tenantId,
      MessageRole.user,
      data.prompt,
      undefined,
      { materialTypeId: data.materialTypeId, type: effectiveType, parsedIntent } as unknown as Prisma.InputJsonValue,
    );

    // Use structured prompt if available, otherwise fall back to original flow
    if (structuredPrompt) {
      this.handleAsyncGeneration(generation.id, tenantId,
        this.processGenerationWithPrompt(generation.id, tenantId, structuredPrompt, effectiveData, conversationId),
      );
    } else {
      this.handleAsyncGeneration(generation.id, tenantId,
        this.processGeneration(generation.id, tenantId, effectiveData, materialType.code, conversationId),
      );
    }

    await this.quotaService.recordUsage(tenantId, userId, "generate", {
      generationId: generation.id,
      materialTypeId: data.materialTypeId,
      type: effectiveType,
    });

    return generation;
  }

  // ── Refine ──────────────────────────────────────────────────────────────

  async refine(tenantId: string, userId: string, data: AiRefineDto) {
    await this.quotaService.checkQuota(tenantId, userId);

    const original = await this.prisma.aiGeneration.findFirst({
      where: { id: data.generationId, tenantId },
    });
    if (!original) throw AppError.notFound("Generation", data.generationId);

    const materialType = await this.assertMaterialAccessible(original.materialTypeId, tenantId);
    const size = original.size as { width: number; height: number };
    const conversationId =
      original.conversationId ?? `conv_${randomUUID().replace(/-/g, "")}`;

    // Parse intent from the refine feedback — uses fallback on failure
    let parsedIntent: ParsedIntent;
    try {
      const conversationHistory = original.conversationId
        ? await this.getConversationHistory(original.conversationId, tenantId)
        : [];
      parsedIntent = await this.intentParserService.parseIntent(
        data.feedback,
        undefined,
        conversationHistory,
      );
    } catch (err) {
      this.logger.warn(`Refine intent parsing failed, using fallback: ${err}`);
      parsedIntent = {
        intent: 'MODIFY_IMAGE',
        confidence: 0.5,
        operations: [],
        preserveRules: {},
      };
    }

    // Build refine prompt via PromptPlanner, falling back to LLM on failure
    let refinedAiPrompt: string;
    try {
      refinedAiPrompt = this.promptPlannerService.buildRefinePrompt({
        originalPrompt: original.aiPrompt || original.prompt,
        feedback: data.feedback,
        preserveRules: parsedIntent.preserveRules,
      });
    } catch (err) {
      this.logger.warn(`PromptPlanner refine failed, falling back to LLM: ${err}`);
      refinedAiPrompt = await this.llmService.expandRefinePrompt({
        originalPrompt: original.prompt,
        originalAiPrompt: original.aiPrompt,
        feedback: data.feedback,
        materialCode: materialType.code,
        style: original.style,
        size,
      });
    }

    // Update design state with intent-derived preserve rules
    try {
        const currentState = await this.getDesignState(conversationId, tenantId);
        const updatedState = this.designStateService.updateState(currentState, {
          preserveRules: parsedIntent.preserveRules,
        });
        await this.conversationService.updateDesignState(conversationId, tenantId, updatedState);
      } catch (err) {
        this.logger.warn(`Design state update skipped: ${err}`);
      }

    const generation = await this.prisma.aiGeneration.create({
      data: {
        tenantId,
        userId,
        conversationId,
        parentGenerationId: original.id,
        projectId: original.projectId,
        materialTypeId: original.materialTypeId,
        type: original.type,
        prompt: data.feedback,
        aiPrompt: refinedAiPrompt,
        style: original.style,
        size: AiWorkbenchService.toJsonSize(size),
        sourceImageUrl: original.sourceImageUrl,
        status: AI_GENERATION_STATUS.PROCESSING,
        metadata: parsedIntent
          ? ({ parsedIntent, refineOf: data.generationId } as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });

    this.handleAsyncGeneration(generation.id, tenantId,
      this.processGenerationWithPrompt(
        generation.id, tenantId, refinedAiPrompt,
        {
          materialTypeId: original.materialTypeId,
          type: original.type as "text2img" | "img2img",
          prompt: data.feedback,
          style: original.style,
          size,
          count: data.count || 4,
          sourceImageUrl: original.sourceImageUrl ?? undefined,
        },
        conversationId,
      ),
    );

    await this.quotaService.recordUsage(tenantId, userId, "refine", {
      generationId: generation.id,
      originalGenerationId: data.generationId,
    });

    return generation;
  }

  // ── Series ──────────────────────────────────────────────────────────────

  async generateSeries(tenantId: string, userId: string, data: AiSeriesGenerateDto) {
    await this.quotaService.checkQuota(tenantId, userId);

    const original = await this.prisma.aiGeneration.findFirst({
      where: { id: data.generationId, tenantId },
      include: { materialType: { select: { name: true, code: true } } },
    });
    if (!original) throw AppError.notFound("Generation", data.generationId);

    const targetMaterial = await this.assertMaterialAccessible(
      data.targetMaterialTypeId,
      tenantId,
    );
    const size = original.size as { width: number; height: number };

    const aiPrompt = await this.llmService.buildSeriesPrompt({
      originalPrompt: original.prompt,
      originalAiPrompt: original.aiPrompt,
      sourceMaterialCode: original.materialType.code,
      targetMaterialCode: targetMaterial.code,
      style: original.style,
      size,
      instruction: data.instruction,
    });

    const conversationId =
      original.conversationId ?? `conv_${randomUUID().replace(/-/g, "")}`;

    const generation = await this.prisma.aiGeneration.create({
      data: {
        tenantId,
        userId,
        conversationId,
        parentGenerationId: original.id,
        projectId: original.projectId,
        materialTypeId: data.targetMaterialTypeId,
        type: original.type,
        prompt: data.instruction,
        aiPrompt,
        style: original.style,
        size: AiWorkbenchService.toJsonSize(size),
        sourceImageUrl: original.resultImageUrl ?? original.sourceImageUrl,
        status: AI_GENERATION_STATUS.PROCESSING,
        metadata: {
          action: "series",
          sourceGenerationId: original.id,
          sourceMaterialTypeId: original.materialTypeId,
        } as Prisma.InputJsonValue,
      },
    });

    this.handleAsyncGeneration(generation.id, tenantId,
      this.processGenerationWithPrompt(
        generation.id, tenantId, aiPrompt,
        {
          materialTypeId: data.targetMaterialTypeId,
          type: original.type as "text2img" | "img2img",
          prompt: data.instruction,
          style: original.style,
          size,
          count: data.count,
          sourceImageUrl: original.resultImageUrl ?? original.sourceImageUrl ?? undefined,
        },
        conversationId,
      ),
    );

    await this.quotaService.recordUsage(tenantId, userId, "series", {
      generationId: generation.id,
      originalGenerationId: original.id,
      targetMaterialTypeId: data.targetMaterialTypeId,
    });

    return generation;
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  async listGenerations(tenantId: string, query: AiGenerationQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const where: Prisma.AiGenerationWhereInput = { tenantId };
    if (query.projectId) where.projectId = query.projectId;
    if (query.materialTypeId) where.materialTypeId = query.materialTypeId;
    if (query.conversationId) where.conversationId = query.conversationId;
    if (query.status) where.status = query.status;
    if (typeof query.isBookmarked === "boolean") where.isBookmarked = query.isBookmarked;

    const [items, total] = await Promise.all([
      this.prisma.aiGeneration.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        include: { materialType: { select: { name: true, code: true } } },
      }),
      this.prisma.aiGeneration.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async getGeneration(tenantId: string, id: string) {
    const generation = await this.prisma.aiGeneration.findFirst({
      where: { id, tenantId },
      include: {
        materialType: { select: { name: true, code: true } },
        images: { orderBy: { index: "asc" } },
      },
    });
    if (!generation) throw AppError.notFound("Generation", id);
    return generation;
  }

  async deleteGeneration(tenantId: string, id: string) {
    const generation = await this.prisma.aiGeneration.findFirst({
      where: { id, tenantId },
    });
    if (!generation) throw AppError.notFound("Generation", id);
    await this.prisma.aiGeneration.delete({ where: { id } });
    return { deleted: true };
  }

  async submitFeedback(
    tenantId: string,
    userId: string,
    generationId: string,
    data: AiGenerationFeedbackDto,
  ) {
    const generation = await this.prisma.aiGeneration.findFirst({
      where: { id: generationId, tenantId },
    });
    if (!generation) throw AppError.notFound("Generation", generationId);

    return this.prisma.aiGenerationFeedback.create({
      data: {
        tenantId,
        userId,
        generationId,
        imageId: data.imageId ?? null,
        rating: data.rating,
        reason: data.reason ?? null,
      },
    });
  }

  async getQuotaStats(tenantId: string, userId: string) {
    return this.quotaService.getUsageStats(tenantId, userId);
  }

  // ── Bookmark ────────────────────────────────────────────────────────────

  async updateBookmark(tenantId: string, id: string, data: AiGenerationBookmarkDto) {
    const generation = await this.prisma.aiGeneration.findFirst({
      where: { id, tenantId },
    });
    if (!generation) throw AppError.notFound("Generation", id);

    return this.prisma.aiGeneration.update({
      where: { id },
      data: {
        isBookmarked: data.isBookmarked,
        bookmarkedAt: data.isBookmarked ? new Date() : null,
        businessTags: data.businessTags ? (data.businessTags as Prisma.InputJsonValue) : undefined,
      },
      include: { materialType: { select: { name: true, code: true } } },
    });
  }

  // ── Download ────────────────────────────────────────────────────────────

  async downloadImage(tenantId: string, id: string, index: number) {
    const generation = await this.prisma.aiGeneration.findFirst({
      where: { id, tenantId },
    });
    if (!generation) throw AppError.notFound("Generation", id);

    const urls = (generation.resultImageUrls as string[] | null) ?? [];
    const url = urls[index] ?? generation.resultImageUrl;
    if (!url) throw AppError.notFound("Image");

    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/png";
    const ext = contentType.includes("jpeg") || contentType.includes("jpg")
      ? "jpg"
      : contentType.includes("webp")
        ? "webp"
        : "png";
    const filename = `wedding-${id}-v${index + 1}.${ext}`;

    return { buffer: Buffer.from(arrayBuffer), contentType, filename };
  }

  // ── Compose Text ───────────────────────────────────────────────────────

  async composeWithText(tenantId: string, id: string, data: AiComposeTextDto) {
    const generation = await this.prisma.aiGeneration.findFirst({
      where: { id, tenantId },
      include: { images: { orderBy: { index: "asc" } } },
    });
    if (!generation) throw AppError.notFound("Generation", id);

    // Pick the source image — by index from the generation's images
    const sourceImage = generation.images[data.imageIndex];
    const sourceUrl = sourceImage?.url ?? generation.resultImageUrl;
    if (!sourceUrl) throw AppError.notFound("Source image for composition");

    const size = generation.size as { width: number; height: number };

    // Resolve text overlays from template or build from content
    let texts: TextOverlay[];
    if (data.templateId) {
      const template = this.svgTemplateService.get(data.templateId);
      if (!template) throw AppError.notFound("Template", data.templateId);

      const contentMap: Record<string, string> = {};
      if (data.title) contentMap["title"] = data.title;
      if (data.names) contentMap["names"] = data.names;
      if (data.date) contentMap["date"] = data.date;
      if (data.items) contentMap["items"] = data.items.join("\n");

      texts = template.textPositions
        .filter((pos) => contentMap[pos.id])
        .map((pos) => ({
          text: contentMap[pos.id]!,
          x: pos.x,
          y: pos.y,
          fontSize: pos.fontSize,
          fontFamily: pos.fontFamily,
          color: pos.color,
          maxWidth: pos.maxWidth,
          align: pos.align,
        }));
    } else {
      // Build overlays from content directly with sensible defaults
      texts = [];
      const centerX = Math.round(size.width / 2);

      if (data.title) {
        texts.push({
          text: data.title,
          x: centerX,
          y: Math.round(size.height * 0.12),
          fontSize: Math.round(size.width * 0.04),
          fontFamily: "Noto Serif SC, serif",
          color: "#333333",
          align: "center",
        });
      }

      if (data.names) {
        texts.push({
          text: data.names,
          x: centerX,
          y: Math.round(size.height * 0.25),
          fontSize: Math.round(size.width * 0.03),
          fontFamily: "Noto Serif SC, serif",
          color: "#555555",
          align: "center",
        });
      }

      if (data.items && data.items.length > 0) {
        const startY = Math.round(size.height * 0.4);
        const lineHeight = Math.round(size.width * 0.03 * 1.6);
        data.items.forEach((item, i) => {
          texts.push({
            text: item,
            x: Math.round(size.width * 0.15),
            y: startY + i * lineHeight,
            fontSize: Math.round(size.width * 0.025),
            maxWidth: Math.round(size.width * 0.7),
          });
        });
      }

      if (data.date) {
        texts.push({
          text: data.date,
          x: centerX,
          y: Math.round(size.height * 0.9),
          fontSize: Math.round(size.width * 0.02),
          fontFamily: "Noto Sans SC, sans-serif",
          color: "#888888",
          align: "center",
        });
      }
    }

    if (texts.length === 0) {
      throw AppError.badRequest("No text content provided for composition");
    }

    // Compose image with text overlay
    const composedBuffer = await this.resultComposer.compose({
      backgroundUrl: sourceUrl,
      texts,
      width: size.width,
      height: size.height,
      outputFormat: "png",
    });

    // Upload composed image to object storage
    const filename = `composed-${id}-${randomUUID().slice(0, 8)}.png`;
    const uploadResult = await this.objectStorage.upload(
      composedBuffer,
      filename,
      "image/png",
      tenantId,
    );

    // Create a new AiGenerationImage record for the composed image
    const nextIndex = generation.images.length;
    const composedImage = await this.prisma.aiGenerationImage.create({
      data: {
        generationId: id,
        tenantId,
        url: uploadResult.url,
        index: nextIndex,
        width: size.width,
        height: size.height,
        isSelected: false,
        metadata: {
          composed: true,
          templateId: data.templateId ?? null,
          textContent: {
            title: data.title,
            items: data.items,
            names: data.names,
            date: data.date,
          },
        } as Prisma.InputJsonValue,
      },
    });

    return composedImage;
  }

  // ── Image Records ───────────────────────────────────────────────────────

  async selectImage(tenantId: string, imageId: string) {
    const image = await this.prisma.aiGenerationImage.findFirst({
      where: { id: imageId, tenantId },
    });
    if (!image) throw AppError.notFound("Image", imageId);

    // Deselect all other images for this generation, then select this one
    await this.prisma.$transaction([
      this.prisma.aiGenerationImage.updateMany({
        where: { generationId: image.generationId, tenantId, isSelected: true },
        data: { isSelected: false },
      }),
      this.prisma.aiGenerationImage.update({
        where: { id: imageId },
        data: { isSelected: true },
      }),
    ]);

    return this.prisma.aiGenerationImage.findUnique({ where: { id: imageId } });
  }

  async bookmarkImage(tenantId: string, imageId: string, isBookmarked: boolean) {
    const image = await this.prisma.aiGenerationImage.findFirst({
      where: { id: imageId, tenantId },
    });
    if (!image) throw AppError.notFound("Image", imageId);

    return this.prisma.aiGenerationImage.update({
      where: { id: imageId },
      data: { isBookmarked },
    });
  }

  async getImageForDownload(tenantId: string, imageId: string) {
    const image = await this.prisma.aiGenerationImage.findFirst({
      where: { id: imageId, tenantId },
    });
    if (!image) throw AppError.notFound("Image", imageId);

    const response = await fetch(image.url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/png";
    const ext = contentType.includes("jpeg") || contentType.includes("jpg")
      ? "jpg"
      : contentType.includes("webp")
        ? "webp"
        : "png";
    const filename = `wedding-${imageId}.${ext}`;

    return { buffer: Buffer.from(arrayBuffer), contentType, filename };
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private async processGeneration(
    id: string,
    tenantId: string,
    data: AiGenerateDto,
    materialCode: string,
    conversationId?: string,
  ) {
    try {
      const aiPrompt = await this.llmService.expandPrompt(
        data.prompt,
        materialCode,
        data.style,
        data.size,
      );
      await this.processGenerationWithPrompt(id, tenantId, aiPrompt, data, conversationId);
    } catch (error) {
      await this.markGenerationFailed(id, error);
    }
  }

  private async getConfiguredConcurrency(): Promise<number> {
    // 1. Admin override via settings always wins
    try {
      const settings = await this.settingsService.getByGroup('ai');
      const override = settings.find((s) => s.key === 'ai.concurrency');
      if (override?.value != null) {
        return Math.max(1, Math.min(10, Number(override.value) || 2));
      }
    } catch { /* fall through to provider defaults */ }

    // 2. Provider-aware defaults based on known rate limits
    try {
      const imageSettings = await this.settingsService.getByGroup('ai');
      const imgCfg = imageSettings.find((s) => s.key === 'ai.image');
      const provider = (imgCfg?.value as any)?.provider ?? 'openai';

      if (provider === 'modelscope') return 1; // strict rate limit
    } catch { /* fall through */ }

    // 3. Sensible default
    return 2;
  }

  private async processGenerationWithPrompt(
    id: string,
    tenantId: string,
    aiPrompt: string,
    data: AiGenerateDto,
    conversationId?: string,
  ) {
    try {
      this.eventsService.emitStarted(id, tenantId);

      await this.prisma.aiGeneration.update({
        where: { id },
        data: { aiPrompt },
      });

      const count = data.count || 4;
      const tasks = Array.from({ length: count }, () => () =>
        this.imageService.generate(aiPrompt, data.size, data.type, data.sourceImageUrl),
      );
      const concurrency = await this.getConfiguredConcurrency();
      const results = await this.runWithConcurrency(tasks, concurrency);

      const succeeded = results
        .filter((r): r is PromiseFulfilledResult<{
          images: string[];
          metadata?: Record<string, unknown>;
        }> => r.status === "fulfilled")
        .map((r) => r.value);

      if (succeeded.length === 0) {
        const firstError = results.find((r) => r.status === "rejected") as
          | PromiseRejectedResult
          | undefined;
        throw new Error(
          firstError?.reason instanceof Error
            ? firstError.reason.message
            : "All image generations failed",
        );
      }

      const imageUrls = succeeded.flatMap((s) => s.images);
      const firstMeta = succeeded[0]!.metadata;

      await this.prisma.aiGeneration.update({
        where: { id },
        data: {
          resultImageUrl: imageUrls[0],
          resultImageUrls: imageUrls as Prisma.InputJsonValue,
          status: AI_GENERATION_STATUS.COMPLETED,
          metadata: {
            ...firstMeta,
            requested: count,
            produced: imageUrls.length,
          } as Prisma.InputJsonValue,
        },
      });

      // Create individual AiGenerationImage records for each generated image
      await this.prisma.aiGenerationImage.createMany({
        data: imageUrls.map((url, index) => ({
          generationId: id,
          tenantId,
          url,
          index,
          isSelected: index === 0, // first image selected by default
          provider: firstMeta?.provider as string | undefined,
          model: firstMeta?.model as string | undefined,
          seed: firstMeta?.seed as string | undefined,
          width: data.size.width,
          height: data.size.height,
          metadata: (firstMeta ?? undefined) as Prisma.InputJsonValue | undefined,
        })),
      });

      // Record AI response message in the conversation
      if (conversationId) {
        await this.conversationService.addMessage(
          conversationId,
          tenantId,
          MessageRole.assistant,
          undefined,
          id,
          { produced: imageUrls.length },
        );
      }

      this.eventsService.emitCompleted(id, tenantId);
    } catch (error) {
      await this.markGenerationFailed(id, error);
      this.eventsService.emitFailed(id, tenantId, error instanceof Error ? error.message : String(error));
      throw error; // re-throw for the fire-and-forget wrapper to catch
    }
  }

  private async markGenerationFailed(id: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Sanitize: strip potential API keys or tokens from error messages
    const sanitized = message.length > 200 ? message.slice(0, 200) + '...' : message;
    this.logger.error(`Generation ${id} processing failed: ${sanitized}`);
    await this.prisma.aiGeneration.update({
      where: { id },
      data: {
        status: AI_GENERATION_STATUS.FAILED,
        errorMessage: message.slice(0, 2000),
      },
    });
  }

  private async getDesignState(conversationId: string, tenantId: string): Promise<DesignState> {
    try {
      const conversation = await this.conversationService.findById(tenantId, conversationId);
      const stored = conversation.currentDesignState;
      if (stored) return this.designStateService.fromJSON(stored);
    } catch {
      // Conversation not found or no stored state — start fresh
    }
    return this.designStateService.createInitialState();
  }

  private async getConversationHistory(conversationId: string, tenantId: string): Promise<string[]> {
    try {
      const conversation = await this.conversationService.findById(tenantId, conversationId);
      const messages = conversation.messages ?? [];
      return messages
        .filter((m) => m.content)
        .slice(-10)
        .map((m) => `${m.role}: ${m.content}`);
    } catch {
      return [];
    }
  }

  private async assertMaterialAccessible(materialTypeId: string, tenantId: string) {
    const materialType = await this.prisma.materialType.findFirst({
      where: {
        id: materialTypeId,
        OR: [{ isSystem: true }, { tenantId }],
      },
    });
    if (!materialType) throw AppError.notFound("Material type", materialTypeId);
    return materialType;
  }

  private async resolveConversationId(
    tenantId: string,
    userId: string,
    conversationId?: string,
    projectId?: string,
  ) {
    if (conversationId) return conversationId;
    const conversation = await this.conversationService.create(
      tenantId,
      userId,
      projectId,
    );
    return conversation.id;
  }

  private async runWithConcurrency<T>(
    items: Array<() => Promise<T>>,
    concurrency: number,
  ): Promise<PromiseSettledResult<T>[]> {
    const results: PromiseSettledResult<T>[] = new Array(items.length);
    let cursor = 0;
    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => {
        while (true) {
          const index = cursor++;
          if (index >= items.length) return;
          try {
            results[index] = { status: "fulfilled", value: await items[index]!() };
          } catch (reason) {
            results[index] = { status: "rejected", reason };
          }
        }
      },
    );
    await Promise.all(workers);
    return results;
  }
}
