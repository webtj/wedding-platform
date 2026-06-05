import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSceneDto, UpdateSceneDto, SceneQueryDto } from './dto';

const DEFAULT_SCENE_DATA = {
  version: '1.0.0',
  camera: { zoom: 1, panX: 0, panY: 0 },
  style: { theme: 'default', colorPalette: ['#F3E3C3', '#C9A45C', '#FFFFFF'] },
  objects: [],
  layers: [
    { id: 'stage', name: '舞台', visible: true, locked: false },
    { id: 'tables', name: '桌椅', visible: true, locked: false },
    { id: 'ceremony', name: '仪式', visible: true, locked: false },
    { id: 'entrance', name: '入口', visible: true, locked: false },
    { id: 'decoration', name: '装饰', visible: true, locked: false }
  ]
};

@Injectable()
export class ScenesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: SceneQueryDto) {
    const where = {
      tenantId,
      ...(query.projectId ? { projectId: query.projectId } : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.scene.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { project: { select: { id: true, projectNo: true, brideName: true, groomName: true } } }
      }),
      this.prisma.scene.count({ where })
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) };
  }

  async get(tenantId: string, id: string) {
    const scene = await this.prisma.scene.findFirst({
      where: { id, tenantId },
      include: { project: { select: { id: true, projectNo: true, brideName: true, groomName: true } } }
    });
    if (!scene) throw new NotFoundException('Scene not found');
    return scene;
  }

  async getByProject(tenantId: string, projectId: string) {
    const scene = await this.prisma.scene.findFirst({
      where: { tenantId, projectId },
      orderBy: { updatedAt: 'desc' }
    });
    return scene;
  }

  async create(tenantId: string, data: CreateSceneDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: data.projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.scene.create({
      data: {
        tenantId,
        projectId: data.projectId,
        name: data.name,
        width: data.width,
        height: data.height,
        unit: data.unit,
        sceneData: {
          ...DEFAULT_SCENE_DATA,
          projectId: data.projectId,
          venue: {
            type: 'banquet_hall',
            name: project.venue ?? '宴会厅',
            width: data.width,
            depth: data.height,
            height: 6,
            entrances: [{ id: 'entrance_01', x: data.width / 2, y: data.height, direction: 'south' }],
            mainDirection: 'north'
          }
        }
      }
    });
  }

  async update(tenantId: string, id: string, data: UpdateSceneDto) {
    const existing = await this.prisma.scene.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Scene not found');

    return this.prisma.scene.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.width !== undefined ? { width: data.width } : {}),
        ...(data.height !== undefined ? { height: data.height } : {}),
        ...(data.sceneData !== undefined ? { sceneData: data.sceneData as any, version: { increment: 1 } } : {}),
        ...(data.thumbnail !== undefined ? { thumbnail: data.thumbnail } : {})
      }
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.scene.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Scene not found');
    await this.prisma.scene.delete({ where: { id } });
    return { deleted: true };
  }
}
