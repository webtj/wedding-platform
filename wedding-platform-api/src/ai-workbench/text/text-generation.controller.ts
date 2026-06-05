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
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import type { AuthContext } from '../../common/auth/auth-context';
import { requireTenant } from '../../common/tenant-context';
import {
  aiTextGenerateSchema,
  aiTextRefineSchema,
  aiTextGenerationQuerySchema,
  aiTextBookmarkSchema,
} from './text-generation.dto';
import { TextGenerationService } from './text-generation.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai/text')
export class TextGenerationController {
  constructor(private readonly textGenerationService: TextGenerationService) {}

  @RequirePermissions(PERMISSIONS.AI_TEXT_GENERATE)
  @Post('generate')
  generate(@Req() request: { auth?: AuthContext }, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.textGenerationService.generate(
      tenant.tenantId,
      tenant.userId,
      aiTextGenerateSchema.parse(body),
    );
  }

  @RequirePermissions(PERMISSIONS.AI_TEXT_GENERATE)
  @Post('generations/:id/refine')
  refine(
    @Req() request: { auth?: AuthContext },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenant = requireTenant(request.auth);
    return this.textGenerationService.refine(
      tenant.tenantId,
      tenant.userId,
      id,
      aiTextRefineSchema.parse(body),
    );
  }

  @RequirePermissions(PERMISSIONS.AI_TEXT_GENERATION_READ)
  @Get('generations')
  list(
    @Req() request: { auth?: AuthContext },
    @Query() query: Record<string, string>,
  ) {
    const tenant = requireTenant(request.auth);
    const parsed = aiTextGenerationQuerySchema.parse({
      type: query.type,
      projectId: query.projectId,
      isBookmarked:
        query.isBookmarked === undefined
          ? undefined
          : query.isBookmarked === 'true',
      page: query.page ? parseInt(query.page, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 20,
    });
    return this.textGenerationService.list(tenant.tenantId, parsed);
  }

  @RequirePermissions(PERMISSIONS.AI_TEXT_GENERATION_READ)
  @Get('generations/:id')
  getById(
    @Req() request: { auth?: AuthContext },
    @Param('id') id: string,
  ) {
    const tenant = requireTenant(request.auth);
    return this.textGenerationService.getById(tenant.tenantId, id);
  }

  @RequirePermissions(PERMISSIONS.AI_TEXT_GENERATION_BOOKMARK)
  @Patch('generations/:id/bookmark')
  updateBookmark(
    @Req() request: { auth?: AuthContext },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenant = requireTenant(request.auth);
    const { isBookmarked } = aiTextBookmarkSchema.parse(body);
    return this.textGenerationService.updateBookmark(
      tenant.tenantId,
      id,
      isBookmarked,
    );
  }

  @RequirePermissions(PERMISSIONS.AI_TEXT_GENERATION_READ)
  @Delete('generations/:id')
  delete(
    @Req() request: { auth?: AuthContext },
    @Param('id') id: string,
  ) {
    const tenant = requireTenant(request.auth);
    return this.textGenerationService.delete(tenant.tenantId, id);
  }
}
