import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReferenceAssetRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ObjectStorageService } from '../../storage/object-storage.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

@Injectable()
export class AiReferenceAssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  async createFromFile(params: {
    tenantId: string;
    userId: string;
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
    role: ReferenceAssetRole;
    projectId?: string;
    conversationId?: string;
  }) {
    const { tenantId, userId, file, role, projectId, conversationId } = params;

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Upload to object storage
    const filename = file.originalname || `reference-${Date.now()}.png`;
    const uploadResult = await this.objectStorage.upload(
      file.buffer,
      filename,
      file.mimetype,
      tenantId,
    );

    return this.prisma.aiReferenceAsset.create({
      data: {
        tenantId,
        userId,
        projectId: projectId ?? null,
        conversationId: conversationId ?? null,
        role,
        url: uploadResult.url,
        filename,
        contentType: file.mimetype,
        sizeBytes: file.size,
        metadata: { storageKey: uploadResult.key },
      },
    });
  }

  async create(data: {
    tenantId: string;
    userId: string;
    projectId?: string;
    conversationId?: string;
    role: ReferenceAssetRole;
    url: string;
    thumbnailUrl?: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    metadata?: any;
  }) {
    return this.prisma.aiReferenceAsset.create({ data });
  }

  async findById(tenantId: string, id: string) {
    const asset = await this.prisma.aiReferenceAsset.findFirst({
      where: { id, tenantId },
    });
    if (!asset) throw new NotFoundException('Reference asset not found');
    return asset;
  }

  async list(tenantId: string, projectId?: string, conversationId?: string) {
    const where: any = { tenantId };
    if (projectId) where.projectId = projectId;
    if (conversationId) where.conversationId = conversationId;

    return this.prisma.aiReferenceAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(tenantId: string, id: string) {
    const asset = await this.findById(tenantId, id);

    // Delete from object storage if storageKey exists
    const metadata = asset.metadata as Record<string, unknown> | null;
    const storageKey = metadata?.storageKey as string | undefined;
    if (storageKey) {
      await this.objectStorage.delete(storageKey);
    }

    await this.prisma.aiReferenceAsset.delete({ where: { id } });
    return { deleted: true };
  }
}
