import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';
import type { CreateMaterialCategoryDto, UpdateMaterialCategoryDto, CreateMaterialDto, UpdateMaterialDto } from './dto';

@Injectable()
export class MaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async listCategories(input: { tenantId: string }) {
    return this.prisma.materialCategory.findMany({
      where: { tenantId: input.tenantId },
      orderBy: { sortOrder: 'asc' }
    });
  }

  async createCategory(input: { tenantId: string; userId: string; data: CreateMaterialCategoryDto }) {
    const existing = await this.prisma.materialCategory.findFirst({
      where: { tenantId: input.tenantId, name: input.data.name }
    });
    if (existing) {
      throw AppError.conflict(`分类名称 "${input.data.name}" 已存在`);
    }
    const cat = await this.prisma.materialCategory.create({
      data: { tenantId: input.tenantId, ...input.data }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'material_category.create',
      entity: 'material_category',
      entityId: cat.id,
      metadata: { name: cat.name }
    });
    return cat;
  }

  async updateCategory(input: { tenantId: string; userId: string; categoryId: string; data: UpdateMaterialCategoryDto }) {
    const cat = await this.prisma.materialCategory.findFirst({
      where: { id: input.categoryId, tenantId: input.tenantId }
    });
    if (!cat) throw new NotFoundException('Category not found');
    if (input.data.name && input.data.name !== cat.name) {
      const dup = await this.prisma.materialCategory.findFirst({
        where: { tenantId: input.tenantId, name: input.data.name, id: { not: cat.id } }
      });
      if (dup) {
        throw AppError.conflict(`分类名称 "${input.data.name}" 已存在`);
      }
    }
    const updated = await this.prisma.materialCategory.update({
      where: { id: input.categoryId },
      data: input.data
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'material_category.update',
      entity: 'material_category',
      entityId: cat.id,
      metadata: { name: cat.name, changes: input.data as Record<string, unknown> }
    });
    return updated;
  }

  async deleteCategory(input: { tenantId: string; userId: string; categoryId: string }) {
    const cat = await this.prisma.materialCategory.findFirst({
      where: { id: input.categoryId, tenantId: input.tenantId }
    });
    if (!cat) throw new NotFoundException('Category not found');
    const materialCount = await this.prisma.material.count({
      where: { categoryId: input.categoryId }
    });
    await this.prisma.materialCategory.delete({ where: { id: input.categoryId } });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'material_category.delete',
      entity: 'material_category',
      entityId: cat.id,
      metadata: { name: cat.name, cascadedMaterials: materialCount }
    });
    return { deleted: true };
  }

  async listMaterials(input: { tenantId: string; categoryId?: string; page?: number; pageSize?: number }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 50;
    const where: Prisma.MaterialWhereInput = {};
    if (input.categoryId) {
      const cat = await this.prisma.materialCategory.findFirst({
        where: { id: input.categoryId, tenantId: input.tenantId }
      });
      if (!cat) throw new NotFoundException('Category not found');
      where.categoryId = input.categoryId;
    } else {
      const cats = await this.prisma.materialCategory.findMany({
        where: { tenantId: input.tenantId },
        select: { id: true }
      });
      where.categoryId = { in: cats.map((c) => c.id) };
    }
    const [items, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.material.count({ where })
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createMaterial(input: { tenantId: string; userId: string; data: CreateMaterialDto }) {
    const cat = await this.prisma.materialCategory.findFirst({
      where: { id: input.data.categoryId, tenantId: input.tenantId }
    });
    if (!cat) throw new NotFoundException('Category not found');
    const mat = await this.prisma.material.create({
      data: { ...input.data, tenantId: input.tenantId }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'material.create',
      entity: 'material',
      entityId: mat.id,
      metadata: { name: mat.name, categoryId: cat.id }
    });
    return mat;
  }

  async updateMaterial(input: { tenantId: string; userId: string; materialId: string; data: UpdateMaterialDto }) {
    const mat = await this.prisma.material.findFirst({
      where: { id: input.materialId },
      include: { category: true }
    });
    if (!mat || mat.category.tenantId !== input.tenantId) {
      throw new NotFoundException('Material not found');
    }
    const updated = await this.prisma.material.update({
      where: { id: input.materialId },
      data: input.data
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'material.update',
      entity: 'material',
      entityId: mat.id,
      metadata: { name: mat.name, changes: input.data as Record<string, unknown> }
    });
    return updated;
  }

  async deleteMaterial(input: { tenantId: string; userId: string; materialId: string }) {
    const mat = await this.prisma.material.findFirst({
      where: { id: input.materialId },
      include: { category: true }
    });
    if (!mat || mat.category.tenantId !== input.tenantId) {
      throw new NotFoundException('Material not found');
    }
    await this.prisma.material.delete({ where: { id: input.materialId } });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
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
    if (!mat || mat.category.tenantId !== input.tenantId) {
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
