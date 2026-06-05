import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMaterialCategoryDto, UpdateMaterialCategoryDto, CreateMaterialDto, UpdateMaterialDto } from './dto';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(input: { tenantId: string }) {
    return this.prisma.materialCategory.findMany({
      where: { tenantId: input.tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { materials: true } } }
    });
  }

  async createCategory(input: { tenantId: string; data: CreateMaterialCategoryDto }) {
    return this.prisma.materialCategory.create({ data: { tenantId: input.tenantId, ...input.data } });
  }

  async updateCategory(input: { tenantId: string; categoryId: string; data: UpdateMaterialCategoryDto }) {
    const cat = await this.prisma.materialCategory.findFirst({ where: { id: input.categoryId, tenantId: input.tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.materialCategory.update({ where: { id: input.categoryId }, data: input.data });
  }

  async deleteCategory(input: { tenantId: string; categoryId: string }) {
    const cat = await this.prisma.materialCategory.findFirst({ where: { id: input.categoryId, tenantId: input.tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.prisma.materialCategory.delete({ where: { id: input.categoryId } });
    return { deleted: true };
  }

  async listMaterials(input: { tenantId: string; categoryId?: string; page?: number; pageSize?: number }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 50;
    const where: Record<string, unknown> = {};
    if (input.categoryId) {
      const cat = await this.prisma.materialCategory.findFirst({ where: { id: input.categoryId, tenantId: input.tenantId } });
      if (!cat) throw new NotFoundException('Category not found');
      where.categoryId = input.categoryId;
    } else {
      const cats = await this.prisma.materialCategory.findMany({ where: { tenantId: input.tenantId }, select: { id: true } });
      where.categoryId = { in: cats.map((c) => c.id) };
    }
    const [items, total] = await Promise.all([
      this.prisma.material.findMany({ where, orderBy: { sortOrder: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.material.count({ where })
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createMaterial(input: { tenantId: string; data: CreateMaterialDto }) {
    const cat = await this.prisma.materialCategory.findFirst({ where: { id: input.data.categoryId, tenantId: input.tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.material.create({ data: { ...input.data, tenantId: input.tenantId } });
  }

  async updateMaterial(input: { tenantId: string; materialId: string; data: UpdateMaterialDto }) {
    const mat = await this.prisma.material.findFirst({ where: { id: input.materialId }, include: { category: true } });
    if (!mat || mat.category.tenantId !== input.tenantId) throw new NotFoundException('Material not found');
    return this.prisma.material.update({ where: { id: input.materialId }, data: input.data });
  }

  async deleteMaterial(input: { tenantId: string; materialId: string }) {
    const mat = await this.prisma.material.findFirst({ where: { id: input.materialId }, include: { category: true } });
    if (!mat || mat.category.tenantId !== input.tenantId) throw new NotFoundException('Material not found');
    await this.prisma.material.delete({ where: { id: input.materialId } });
    return { deleted: true };
  }

  async addTaskMaterial(input: { tenantId: string; taskId: string; materialId: string }) {
    const task = await this.prisma.task.findFirst({ where: { id: input.taskId, tenantId: input.tenantId } });
    if (!task) throw new NotFoundException('Task not found');
    const mat = await this.prisma.material.findFirst({ where: { id: input.materialId }, include: { category: true } });
    if (!mat || mat.category.tenantId !== input.tenantId) throw new NotFoundException('Material not found');
    return this.prisma.taskMaterial.create({ data: { taskId: input.taskId, materialId: input.materialId } });
  }

  async removeTaskMaterial(input: { tenantId: string; id: string }) {
    const tm = await this.prisma.taskMaterial.findFirst({ where: { id: input.id }, include: { task: true } });
    if (!tm || tm.task.tenantId !== input.tenantId) throw new NotFoundException('Task material not found');
    await this.prisma.taskMaterial.delete({ where: { id: input.id } });
    return { deleted: true };
  }

  async confirmTaskMaterial(input: { tenantId: string; id: string; confirmed: boolean }) {
    const tm = await this.prisma.taskMaterial.findFirst({ where: { id: input.id }, include: { task: true } });
    if (!tm || tm.task.tenantId !== input.tenantId) throw new NotFoundException('Task material not found');
    return this.prisma.taskMaterial.update({ where: { id: input.id }, data: { confirmed: input.confirmed } });
  }

  async getTaskMaterials(input: { tenantId: string; taskId: string }) {
    const task = await this.prisma.task.findFirst({ where: { id: input.taskId, tenantId: input.tenantId } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.taskMaterial.findMany({
      where: { taskId: input.taskId },
      include: { material: true }
    });
  }
}
