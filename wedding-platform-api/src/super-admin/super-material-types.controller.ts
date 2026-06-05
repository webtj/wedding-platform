import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PlatformGuard } from '../common/auth/platform.guard';
import { createMaterialTypeSchema, updateMaterialTypeSchema } from '../material/dto';
import { SuperMaterialTypesService } from './super-material-types.service';

@UseGuards(JwtAuthGuard, PlatformGuard)
@Controller('super/material-types')
export class SuperMaterialTypesController {
  constructor(private readonly service: SuperMaterialTypesService) {}

  @Get()
  list(
    @Query('tenantId') tenantId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.service.list(
      tenantId || undefined,
      search,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20
    );
  }

  @Post()
  create(@Body() body: unknown) {
    return this.service.create(createMaterialTypeSchema.parse(body));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.service.update(id, updateMaterialTypeSchema.parse(body));
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
