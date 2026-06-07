import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
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
  listCategories(@Req() r: { auth?: AuthContext }) {
    const tenant = requireTenant(r.auth);
    return this.service.listCategories(tenant.tenantId);
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Post('categories')
  createCategory(@Req() r: { auth?: AuthContext }, @Body() body: unknown) {
    const tenant = requireTenant(r.auth);
    return this.service.createCategory(tenant.tenantId, createQuickPromptCategorySchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Patch('categories/:id')
  updateCategory(@Req() r: { auth?: AuthContext }, @Param('id') id: string, @Body() body: unknown) {
    const tenant = requireTenant(r.auth);
    return this.service.updateCategory(tenant.tenantId, id, updateQuickPromptCategorySchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Delete('categories/:id')
  deleteCategory(@Req() r: { auth?: AuthContext }, @Param('id') id: string) {
    const tenant = requireTenant(r.auth);
    return this.service.deleteCategory(tenant.tenantId, id);
  }

  // ── Prompts ─────────────────────────────────────────────────────────────

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Post()
  createPrompt(@Req() r: { auth?: AuthContext }, @Body() body: unknown) {
    const tenant = requireTenant(r.auth);
    return this.service.createPrompt(tenant.tenantId, createQuickPromptSchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Patch(':id')
  updatePrompt(@Req() r: { auth?: AuthContext }, @Param('id') id: string, @Body() body: unknown) {
    const tenant = requireTenant(r.auth);
    return this.service.updatePrompt(tenant.tenantId, id, updateQuickPromptSchema.parse(body));
  }

  @RequirePermissions(PERMISSIONS.MATERIAL_MANAGE)
  @Delete(':id')
  deletePrompt(@Req() r: { auth?: AuthContext }, @Param('id') id: string) {
    const tenant = requireTenant(r.auth);
    return this.service.deletePrompt(tenant.tenantId, id);
  }
}
