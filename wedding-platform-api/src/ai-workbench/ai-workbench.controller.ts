import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { PERMISSIONS } from "@wedding/shared";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { PermissionsGuard } from "../common/auth/permissions.guard";
import { RequirePermissions } from "../common/auth/permissions.decorator";
import type { AuthContext } from "../common/auth/auth-context";
import { requireTenant } from "../common/tenant-context";
import {
  aiGenerateSchema,
  aiRefineSchema,
  aiGenerationQuerySchema,
  aiGenerationBookmarkSchema,
  aiSeriesGenerateSchema,
  aiGenerationFeedbackSchema,
  aiComposeTextSchema,
} from "./dto";
import { AiWorkbenchService } from "./ai-workbench.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("ai")
export class AiWorkbenchController {
  constructor(private readonly aiWorkbenchService: AiWorkbenchService) {}

  @RequirePermissions(PERMISSIONS.AI_GENERATE)
  @Post("generate")
  generate(@Req() request: { auth?: AuthContext }, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.aiWorkbenchService.generate(
      tenant.tenantId,
      tenant.userId,
      aiGenerateSchema.parse(body),
    );
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATE)
  @Post("refine")
  refine(@Req() request: { auth?: AuthContext }, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.aiWorkbenchService.refine(
      tenant.tenantId,
      tenant.userId,
      aiRefineSchema.parse(body),
    );
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_SERIES)
  @Post("series")
  generateSeries(@Req() request: { auth?: AuthContext }, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.aiWorkbenchService.generateSeries(
      tenant.tenantId,
      tenant.userId,
      aiSeriesGenerateSchema.parse(body),
    );
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Get("generations")
  listGenerations(
    @Req() request: { auth?: AuthContext },
    @Query() query: Record<string, string>,
  ) {
    const tenant = requireTenant(request.auth);
    const parsed = aiGenerationQuerySchema.parse({
      projectId: query.projectId,
      materialTypeId: query.materialTypeId,
      conversationId: query.conversationId,
      status: query.status,
      isBookmarked:
        query.isBookmarked === undefined
          ? undefined
          : query.isBookmarked === "true",
      page: query.page ? parseInt(query.page, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 20,
    });
    return this.aiWorkbenchService.listGenerations(tenant.tenantId, parsed);
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Get("generations/:id")
  getGeneration(@Req() request: { auth?: AuthContext }, @Param("id") id: string) {
    const tenant = requireTenant(request.auth);
    return this.aiWorkbenchService.getGeneration(tenant.tenantId, id);
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_BOOKMARK)
  @Patch("generations/:id/bookmark")
  updateBookmark(
    @Req() request: { auth?: AuthContext },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const tenant = requireTenant(request.auth);
    return this.aiWorkbenchService.updateBookmark(
      tenant.tenantId,
      id,
      aiGenerationBookmarkSchema.parse(body),
    );
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Get("generations/:id/download")
  async download(
    @Req() request: { auth?: AuthContext },
    @Param("id") id: string,
    @Query("index") index: string,
    @Res() res: Response,
  ) {
    const tenant = requireTenant(request.auth);
    const idx = index ? parseInt(index, 10) : 0;
    const { buffer, contentType, filename } =
      await this.aiWorkbenchService.downloadImage(
        tenant.tenantId,
        id,
        Number.isNaN(idx) ? 0 : idx,
      );
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Post("generations/:id/feedback")
  submitFeedback(
    @Req() request: { auth?: AuthContext },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const tenant = requireTenant(request.auth);
    return this.aiWorkbenchService.submitFeedback(
      tenant.tenantId,
      tenant.userId,
      id,
      aiGenerationFeedbackSchema.parse(body),
    );
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATE)
  @Post("generations/:id/compose")
  composeText(
    @Req() request: { auth?: AuthContext },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const tenant = requireTenant(request.auth);
    return this.aiWorkbenchService.composeWithText(
      tenant.tenantId,
      id,
      aiComposeTextSchema.parse(body),
    );
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Delete("generations/:id")
  deleteGeneration(@Req() request: { auth?: AuthContext }, @Param("id") id: string) {
    const tenant = requireTenant(request.auth);
    return this.aiWorkbenchService.deleteGeneration(tenant.tenantId, id);
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATE)
  @Get("quota")
  getQuota(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.aiWorkbenchService.getQuotaStats(tenant.tenantId, tenant.userId);
  }

  // ── Individual Image Operations ─────────────────────────────────────────

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Patch("generation-images/:imageId/select")
  selectImage(
    @Req() request: { auth?: AuthContext },
    @Param("imageId") imageId: string,
  ) {
    const tenant = requireTenant(request.auth);
    return this.aiWorkbenchService.selectImage(tenant.tenantId, imageId);
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_BOOKMARK)
  @Patch("generation-images/:imageId/bookmark")
  bookmarkImage(
    @Req() request: { auth?: AuthContext },
    @Param("imageId") imageId: string,
    @Body() body: { isBookmarked: boolean },
  ) {
    const tenant = requireTenant(request.auth);
    return this.aiWorkbenchService.bookmarkImage(
      tenant.tenantId,
      imageId,
      body.isBookmarked,
    );
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Get("generation-images/:imageId/download")
  async downloadImage(
    @Req() request: { auth?: AuthContext },
    @Param("imageId") imageId: string,
    @Res() res: Response,
  ) {
    const tenant = requireTenant(request.auth);
    const { buffer, contentType, filename } =
      await this.aiWorkbenchService.getImageForDownload(tenant.tenantId, imageId);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
