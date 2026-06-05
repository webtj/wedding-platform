import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PlatformGuard } from '../common/auth/platform.guard';
import { PrismaService } from '../prisma/prisma.service';
import { createTenantDtoSchema } from './dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly prisma: PrismaService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@CurrentAuth() auth: { userId: string }) {
    return this.tenantsService.listForUser({
      userId: auth.userId
    });
  }

  @UseGuards(JwtAuthGuard, PlatformGuard)
  @Post()
  create(@Body() body: unknown) {
    return this.tenantsService.create(createTenantDtoSchema.parse(body));
  }
}
