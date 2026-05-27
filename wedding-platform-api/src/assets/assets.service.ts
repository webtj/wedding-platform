import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapter } from './storage-adapter';
import type { CreateAnnotationDto, CreateAssetUploadIntentDto, UpdateAnnotationDto } from './dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageAdapter,
    private readonly audit: AuditService
  ) {}

  list(input: { tenantId: string; projectId: string }) {
    return this.prisma.asset.findMany({
      where: { tenantId: input.tenantId, projectId: input.projectId, status: { not: AssetStatus.deleted } },
      include: { annotations: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createUploadIntent(input: {
    tenantId: string;
    userId: string;
    projectId: string;
    data: CreateAssetUploadIntentDto;
  }) {
    const result = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          tenantId: input.tenantId,
          projectId: input.projectId,
          filename: input.data.filename,
          contentType: input.data.contentType,
          sizeBytes: input.data.sizeBytes,
          category: input.data.category,
          objectKey: 'pending',
          uploadedByUserId: input.userId
        }
      });
      const intent = this.storage.createUploadIntent({
        tenantId: input.tenantId,
        projectId: input.projectId,
        assetId: asset.id,
        filename: input.data.filename,
        contentType: input.data.contentType
      });
      const updatedAsset = await tx.asset.update({
        where: { id: asset.id },
        data: {
          objectKey: intent.objectKey,
          versions: {
            create: {
              version: 1,
              objectKey: intent.objectKey
            }
          }
        }
      });
      return { asset: updatedAsset, upload: intent };
    });

    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'asset.upload_intent.create',
      entity: 'asset',
      entityId: result.asset.id,
      metadata: { projectId: input.projectId }
    });
    return result;
  }

  async markReady(input: { tenantId: string; userId: string; assetId: string }) {
    const result = await this.prisma.asset.updateMany({
      where: { id: input.assetId, tenantId: input.tenantId },
      data: { status: AssetStatus.ready }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'asset.mark_ready',
      entity: 'asset',
      entityId: input.assetId
    });
    return result;
  }

  listAnnotations(input: { tenantId: string; assetId: string }) {
    return this.prisma.assetAnnotation.findMany({
      where: { tenantId: input.tenantId, assetId: input.assetId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createAnnotation(input: { tenantId: string; userId: string; assetId: string; data: CreateAnnotationDto }) {
    const asset = await this.prisma.asset.findFirst({ where: { id: input.assetId, tenantId: input.tenantId } });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    const annotation = await this.prisma.assetAnnotation.create({
      data: {
        tenantId: input.tenantId,
        assetId: input.assetId,
        x: input.data.x,
        y: input.data.y,
        content: input.data.content,
        createdByUserId: input.userId
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'asset.annotation.create',
      entity: 'asset',
      entityId: input.assetId,
      metadata: { annotationId: annotation.id }
    });
    return annotation;
  }

  async updateAnnotation(input: { tenantId: string; userId: string; annotationId: string; data: UpdateAnnotationDto }) {
    const result = await this.prisma.assetAnnotation.updateMany({
      where: { id: input.annotationId, tenantId: input.tenantId },
      data: {
        status: input.data.status,
        reply: input.data.reply
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'asset.annotation.update',
      entity: 'asset_annotation',
      entityId: input.annotationId
    });
    return result;
  }

  async createPreviewIntent(input: { tenantId: string; assetId: string }) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: input.assetId, tenantId: input.tenantId }
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return {
      asset,
      preview: this.storage.createPreviewIntent({ objectKey: asset.objectKey })
    };
  }
}
