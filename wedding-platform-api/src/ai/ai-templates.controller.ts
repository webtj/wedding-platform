import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { AiTemplateCategory } from '@prisma/client';
import { PERMISSIONS } from '@wedding/shared';
import { z } from 'zod';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { AiTemplatesService } from './ai-templates.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai/templates')
export class AiTemplatesController {
  constructor(private readonly aiTemplatesService: AiTemplatesService) {}

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Get()
  list(@Req() request: { auth?: AuthContext }, @Query('category') category?: string) {
    const tenant = requireTenant(request.auth);
    return this.aiTemplatesService.list({
      tenantId: tenant.tenantId,
      category: parseAiTemplateCategory(category)
    });
  }

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Post()
  create(@Req() request: { auth?: AuthContext }, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    const data = createAiTemplateSchema.parse(body);
    return this.aiTemplatesService.create({
      tenantId: tenant.tenantId,
      data
    });
  }

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Patch(':templateId')
  update(
    @Req() request: { auth?: AuthContext },
    @Param('templateId') templateId: string,
    @Body() body: unknown
  ) {
    const tenant = requireTenant(request.auth);
    return this.aiTemplatesService.update({
      tenantId: tenant.tenantId,
      templateId,
      data: updateAiTemplateSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Delete(':templateId')
  delete(@Req() request: { auth?: AuthContext }, @Param('templateId') templateId: string) {
    const tenant = requireTenant(request.auth);
    return this.aiTemplatesService.delete({ tenantId: tenant.tenantId, templateId });
  }
}

const aiTemplateCategorySchema = z.nativeEnum(AiTemplateCategory);

const createAiTemplateSchema = z.object({
  code: z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().trim().min(1),
  category: aiTemplateCategorySchema.default(AiTemplateCategory.image_design),
  prompt: z.string().trim().min(4)
});

const updateAiTemplateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: aiTemplateCategorySchema.optional(),
  prompt: z.string().trim().min(4).optional()
});

function parseAiTemplateCategory(category?: string): AiTemplateCategory | undefined {
  if (!category) return undefined;
  if (Object.values(AiTemplateCategory).includes(category as AiTemplateCategory)) {
    return category as AiTemplateCategory;
  }
  throw new BadRequestException('Invalid AI template category');
}
