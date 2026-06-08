import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';
import type { TenantContext } from '../common/tenant-context';
import type { CreateMaterialCategoryDto, UpdateMaterialCategoryDto, CreateMaterialDto, UpdateMaterialDto } from './dto';

@Injectable()
export class MaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async listCategories(ctx: TenantContext) {
    const where = ctx.isPlatformAdmin
      ? {}
      : { OR: [{ tenantId: null }, { tenantId: ctx.tenantId }] };
    const materialWhere = ctx.isPlatformAdmin
      ? {}
      : { OR: [{ tenantId: null }, { tenantId: ctx.tenantId }] };
    return this.prisma.materialCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        materials: {
          where: materialWhere,
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
  }

  async createCategory(ctx: TenantContext, data: CreateMaterialCategoryDto) {
    const existing = await this.prisma.materialCategory.findFirst({
      where: { tenantId: ctx.tenantId, name: data.name }
    });
    if (existing) {
      throw AppError.conflict(`分类名称 "${data.name}" 已存在`);
    }
    const cat = await this.prisma.materialCategory.create({
      data: { tenantId: ctx.tenantId, ...data }
    });
    await this.audit.record({
      tenantId: ctx.tenantId as string,
      userId: ctx.userId,
      action: 'material_category.create',
      entity: 'material_category',
      entityId: cat.id,
      metadata: { name: cat.name }
    });
    return cat;
  }

  async updateCategory(ctx: TenantContext, categoryId: string, data: UpdateMaterialCategoryDto) {
    const cat = await this.prisma.materialCategory.findFirst({
      where: { id: categoryId }
    });
    if (!cat) throw new NotFoundException('Category not found');

    if (!ctx.isPlatformAdmin) {
      if (cat.tenantId === null) {
        throw AppError.forbidden('内置分类不可编辑');
      }
      if (cat.tenantId !== ctx.tenantId) {
        throw AppError.forbidden('无权修改此分类');
      }
    }

    if (data.name && data.name !== cat.name) {
      const dup = await this.prisma.materialCategory.findFirst({
        where: { tenantId: ctx.tenantId, name: data.name, id: { not: cat.id } }
      });
      if (dup) {
        throw AppError.conflict(`分类名称 "${data.name}" 已存在`);
      }
    }
    const updated = await this.prisma.materialCategory.update({
      where: { id: categoryId },
      data
    });
    await this.audit.record({
      tenantId: ctx.tenantId as string,
      userId: ctx.userId,
      action: 'material_category.update',
      entity: 'material_category',
      entityId: cat.id,
      metadata: { name: cat.name, changes: data as Record<string, unknown> }
    });
    return updated;
  }

  async deleteCategory(ctx: TenantContext, categoryId: string) {
    const cat = await this.prisma.materialCategory.findFirst({
      where: { id: categoryId }
    });
    if (!cat) throw new NotFoundException('Category not found');

    if (!ctx.isPlatformAdmin) {
      if (cat.tenantId === null) {
        throw AppError.forbidden('内置分类不可删除');
      }
      if (cat.tenantId !== ctx.tenantId) {
        throw AppError.forbidden('无权删除此分类');
      }
    }

    const materialCount = await this.prisma.material.count({
      where: { categoryId }
    });
    await this.prisma.materialCategory.delete({ where: { id: categoryId } });
    await this.audit.record({
      tenantId: ctx.tenantId as string,
      userId: ctx.userId,
      action: 'material_category.delete',
      entity: 'material_category',
      entityId: cat.id,
      metadata: { name: cat.name, cascadedMaterials: materialCount }
    });
    return { deleted: true };
  }

  async listMaterials(ctx: TenantContext, categoryId?: string, page?: number, pageSize?: number) {
    const p = page ?? 1;
    const ps = pageSize ?? 50;
    const where: Prisma.MaterialWhereInput = {};
    if (categoryId) {
      const categoryWhere: Prisma.MaterialCategoryWhereInput = ctx.isPlatformAdmin
        ? { id: categoryId }
        : { id: categoryId, OR: [{ tenantId: null }, { tenantId: ctx.tenantId }] };
      const cat = await this.prisma.materialCategory.findFirst({
        where: categoryWhere
      });
      if (!cat) throw new NotFoundException('Category not found');
      where.categoryId = categoryId;
    } else {
      const catWhere = ctx.isPlatformAdmin
        ? {}
        : { OR: [{ tenantId: null }, { tenantId: ctx.tenantId }] };
      const cats = await this.prisma.materialCategory.findMany({
        where: catWhere,
        select: { id: true }
      });
      where.categoryId = { in: cats.map((c) => c.id) };
    }
    const [items, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (p - 1) * ps,
        take: ps
      }),
      this.prisma.material.count({ where })
    ]);
    return { items, total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) };
  }

  async createMaterial(ctx: TenantContext, data: CreateMaterialDto) {
    const catWhere = ctx.isPlatformAdmin
      ? { id: data.categoryId }
      : { id: data.categoryId, tenantId: ctx.tenantId };
    const cat = await this.prisma.materialCategory.findFirst({
      where: catWhere
    });
    if (!cat) throw new NotFoundException('Category not found');
    const mat = await this.prisma.material.create({
      data: { ...data, tenantId: ctx.tenantId }
    });
    await this.audit.record({
      tenantId: ctx.tenantId as string,
      userId: ctx.userId,
      action: 'material.create',
      entity: 'material',
      entityId: mat.id,
      metadata: { name: mat.name, categoryId: cat.id }
    });
    return mat;
  }

  async updateMaterial(ctx: TenantContext, materialId: string, data: UpdateMaterialDto) {
    const mat = await this.prisma.material.findFirst({
      where: { id: materialId },
      include: { category: true }
    });
    if (!mat) throw new NotFoundException('Material not found');
    if (!ctx.isPlatformAdmin) {
      if (!mat.tenantId) throw AppError.forbidden('内置物料不可编辑');
      if (mat.tenantId !== ctx.tenantId) throw new NotFoundException('Material not found');
    }
    const updated = await this.prisma.material.update({
      where: { id: materialId },
      data
    });
    await this.audit.record({
      tenantId: ctx.tenantId as string,
      userId: ctx.userId,
      action: 'material.update',
      entity: 'material',
      entityId: mat.id,
      metadata: { name: mat.name, changes: data as Record<string, unknown> }
    });
    return updated;
  }

  async deleteMaterial(ctx: TenantContext, materialId: string) {
    const mat = await this.prisma.material.findFirst({
      where: { id: materialId },
      include: { category: true }
    });
    if (!mat) throw new NotFoundException('Material not found');
    if (!ctx.isPlatformAdmin) {
      if (!mat.tenantId) throw AppError.forbidden('内置物料不可删除');
      if (mat.tenantId !== ctx.tenantId) throw new NotFoundException('Material not found');
    }
    await this.prisma.material.delete({ where: { id: materialId } });
    await this.audit.record({
      tenantId: ctx.tenantId as string,
      userId: ctx.userId,
      action: 'material.delete',
      entity: 'material',
      entityId: mat.id,
      metadata: { name: mat.name, categoryId: mat.categoryId }
    });
    return { deleted: true };
  }

  async addTaskMaterial(input: { tenantId: string; taskId: string; materialId: string }) {
    const task = await this.prisma.task.findFirst({
      where: { id: input.taskId, tenantId: input.tenantId }
    });
    if (!task) throw new NotFoundException('Task not found');
    const mat = await this.prisma.material.findFirst({
      where: { id: input.materialId },
      include: { category: true }
    });
    // Allow built-in materials (tenantId=null) or tenant's own materials
    if (!mat || (mat.category.tenantId !== null && mat.category.tenantId !== input.tenantId)) {
      throw new NotFoundException('Material not found');
    }
    return this.prisma.taskMaterial.create({
      data: { taskId: input.taskId, materialId: input.materialId }
    });
  }

  async removeTaskMaterial(input: { tenantId: string; id: string }) {
    const tm = await this.prisma.taskMaterial.findFirst({
      where: { id: input.id },
      include: { task: true }
    });
    if (!tm || tm.task.tenantId !== input.tenantId) {
      throw new NotFoundException('Task material not found');
    }
    await this.prisma.taskMaterial.delete({ where: { id: input.id } });
    return { deleted: true };
  }

  async confirmTaskMaterial(input: { tenantId: string; id: string; confirmed: boolean }) {
    const tm = await this.prisma.taskMaterial.findFirst({
      where: { id: input.id },
      include: { task: true }
    });
    if (!tm || tm.task.tenantId !== input.tenantId) {
      throw new NotFoundException('Task material not found');
    }
    return this.prisma.taskMaterial.update({
      where: { id: input.id },
      data: { confirmed: input.confirmed }
    });
  }

  async getTaskMaterials(input: { tenantId: string; taskId: string }) {
    const task = await this.prisma.task.findFirst({
      where: { id: input.taskId, tenantId: input.tenantId }
    });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.taskMaterial.findMany({
      where: { taskId: input.taskId },
      include: { material: true }
    });
  }
}
