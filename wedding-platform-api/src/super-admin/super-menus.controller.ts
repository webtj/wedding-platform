import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { createMenuItemSchema, updateMenuItemSchema } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PlatformGuard } from '../common/auth/platform.guard';
import { SuperMenusService } from './super-menus.service';

@UseGuards(JwtAuthGuard, PlatformGuard)
@Controller('super/menus')
export class SuperMenusController {
  constructor(private readonly superMenusService: SuperMenusService) {}

  @Get()
  list() {
    return this.superMenusService.list();
  }

  @Get('all')
  listAll() {
    return this.superMenusService.listAll();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.superMenusService.create(createMenuItemSchema.parse(body));
  }

  @Patch(':menuItemId')
  update(@Param('menuItemId') menuItemId: string, @Body() body: unknown) {
    return this.superMenusService.update({
      menuItemId,
      data: updateMenuItemSchema.parse(body)
    });
  }

  @Delete(':menuItemId')
  delete(@Param('menuItemId') menuItemId: string) {
    return this.superMenusService.delete(menuItemId);
  }

  @Put('reorder')
  reorder(@Body() body: { items: { id: string; sortOrder: number }[] }) {
    return this.superMenusService.reorder(body);
  }
}
