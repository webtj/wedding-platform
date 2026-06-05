import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapter } from './storage-adapter';
import type { CreateAssetUploadIntentDto } from './dto';

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
    return Promise.resolve([]);
  }

  async createAnnotation(): Promise<never> {
    throw new NotFoundException('Annotations module has been removed');
  }

  async updateAnnotation(): Promise<never> {
    throw new NotFoundException('Annotations module has been removed');
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
