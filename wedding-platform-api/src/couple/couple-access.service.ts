import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectMemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoupleAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireCoupleProject(input: { tenantId: string; userId: string; projectId: string }) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: input.projectId,
        tenantId: input.tenantId
      }
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const member = await this.prisma.projectMember.findFirst({
      where: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        userId: input.userId,
        role: ProjectMemberRole.couple
      }
    });
    if (!member) {
      throw new ForbiddenException('Couple project access is required');
    }
    return project;
  }

  listCoupleProjects(input: { tenantId: string; userId: string }) {
    return this.prisma.project.findMany({
      where: {
        tenantId: input.tenantId,
        members: {
          some: {
            userId: input.userId,
            role: ProjectMemberRole.couple
          }
        }
      },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } }
      },
      orderBy: { weddingDate: 'asc' }
    });
  }
}
