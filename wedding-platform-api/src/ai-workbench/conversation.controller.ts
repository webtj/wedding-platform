import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { ConversationService } from './conversation.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai/conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Post()
  create(
    @Req() request: { auth?: AuthContext },
    @Body() body: { projectId?: string; title?: string },
  ) {
    const tenant = requireTenant(request.auth);
    return this.conversationService.create(
      tenant.tenantId,
      tenant.userId,
      body.projectId,
      body.title,
    );
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Get()
  list(
    @Req() request: { auth?: AuthContext },
    @Query('projectId') projectId?: string,
  ) {
    const tenant = requireTenant(request.auth);
    return this.conversationService.list(tenant.tenantId, projectId);
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Get(':id')
  findById(
    @Req() request: { auth?: AuthContext },
    @Param('id') id: string,
  ) {
    const tenant = requireTenant(request.auth);
    return this.conversationService.findById(tenant.tenantId, id);
  }

  @RequirePermissions(PERMISSIONS.AI_USE)
  @Post(':id/messages')
  addMessage(
    @Req() request: { auth?: AuthContext },
    @Param('id') id: string,
    @Body() body: { role: MessageRole; content?: string; generationId?: string; metadata?: any },
  ) {
    const tenant = requireTenant(request.auth);
    return this.conversationService.addMessage(
      id,
      tenant.tenantId,
      body.role,
      body.content,
      body.generationId,
      body.metadata,
    );
  }

  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  @Delete(':id')
  delete(
    @Req() request: { auth?: AuthContext },
    @Param('id') id: string,
  ) {
    const tenant = requireTenant(request.auth);
    return this.conversationService.delete(tenant.tenantId, id);
  }
}
