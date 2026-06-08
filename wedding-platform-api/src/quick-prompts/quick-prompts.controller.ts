import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { getTenantContext } from '../common/tenant-context';
import { QuickPromptsService } from './quick-prompts.service';
import {
  createQuickPromptCategorySchema,
  updateQuickPromptCategorySchema,
  createQuickPromptSchema,
  updateQuickPromptSchema
} from './dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('quick-prompts')
export class QuickPromptsController {
  constructor(private readonly service: QuickPromptsService) {}

  // ── Categories ──────────────────────────────────────────────────────────

  @RequirePermissions(PERMISSIONS.MATERIAL_READ)
  @Get('categories')
  listCategories(@Req() r: { auth?: AuthContext }, @Query('type') type?: string) {
    const ctx = getTenantContext(r.auth);
    return this.service.listCategories(ctx, type);
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Post('categories')
  createCategory(@Req() r: { auth?: AuthContext }, @Body() body: unknown) {
    const ctx = getTenantContext(r.auth);
    return this.service.createCategory(ctx, createQuickPromptCategorySchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Patch('categories/:id')
  updateCategory(@Req() r: { auth?: AuthContext }, @Param('id') id: string, @Body() body: unknown) {
    const ctx = getTenantContext(r.auth);
    return this.service.updateCategory(ctx, id, updateQuickPromptCategorySchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Delete('categories/:id')
  deleteCategory(@Req() r: { auth?: AuthContext }, @Param('id') id: string) {
    const ctx = getTenantContext(r.auth);
    return this.service.deleteCategory(ctx, id);
  }

  // ── Prompts ─────────────────────────────────────────────────────────────

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Post()
  createPrompt(@Req() r: { auth?: AuthContext }, @Body() body: unknown) {
    const ctx = getTenantContext(r.auth);
    return this.service.createPrompt(ctx, createQuickPromptSchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Patch(':id')
  updatePrompt(@Req() r: { auth?: AuthContext }, @Param('id') id: string, @Body() body: unknown) {
    const ctx = getTenantContext(r.auth);
    return this.service.updatePrompt(ctx, id, updateQuickPromptSchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Delete(':id')
  deletePrompt(@Req() r: { auth?: AuthContext }, @Param('id') id: string) {
    const ctx = getTenantContext(r.auth);
    return this.service.deletePrompt(ctx, id);
  }
}
