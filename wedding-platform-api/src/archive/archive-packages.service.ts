import { Injectable, NotFoundException } from '@nestjs/common';
import { ArchivePackageStatus } from '@prisma/client';
import JSZip from 'jszip';
import { StorageAdapter } from '../assets/storage-adapter';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateArchivePackageDto } from './dto';

@Injectable()
export class ArchivePackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageAdapter,
    private readonly audit: AuditService
  ) {}

  list(input: { tenantId: string; projectId: string }) {
    return this.prisma.archivePackage.findMany({
      where: { tenantId: input.tenantId, projectId: input.projectId },
      include: { items: { include: { asset: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(input: { tenantId: string; userId: string; projectId: string; data: CreateArchivePackageDto }) {
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, tenantId: input.tenantId },
      include: {
        assets: true,
        aiOutputs: true,
        contracts: input.data.includeContracts
      }
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const pkg = await this.prisma.archivePackage.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        type: input.data.type,
        title: input.data.title,
        status: ArchivePackageStatus.processing,
        expiresAt: new Date(Date.now() + input.data.expiresInDays * 24 * 60 * 60 * 1000),
        createdByUserId: input.userId
      }
    });

    const zip = new JSZip();
    zip.file(
      'README.txt',
      [
        `项目：${project.brideName} & ${project.groomName}`,
        `婚期：${project.weddingDate.toISOString().slice(0, 10)}`,
        `资料包：${input.data.title}`
      ].join('\n')
    );

    if (input.data.includeAssets) {
      for (const asset of project.assets) {
        zip.file(`assets/${asset.filename}.txt`, `原始文件对象键：${asset.objectKey}`);
      }
    }

    if (input.data.includeAiOutputs) {
      for (const output of project.aiOutputs) {
        zip.file(`ai/${output.title}.txt`, output.content);
      }
    }

    if (input.data.includeContracts && 'contracts' in project) {
      zip.file('contracts/summary.json', JSON.stringify(project.contracts, null, 2));
    }

    const bytes = await zip.generateAsync({ type: 'nodebuffer' });
    const objectKey = `tenants/${input.tenantId}/projects/${input.projectId}/archives/${pkg.id}.zip`;
    const stored = await this.storage.putObject({
      objectKey,
      bytes,
      contentType: 'application/zip'
    });

    const ready = await this.prisma.archivePackage.update({
      where: { id: pkg.id },
      data: {
        status: ArchivePackageStatus.ready,
        objectKey,
        sizeBytes: stored.sizeBytes,
        items: {
          create: input.data.includeAssets ? project.assets.map((asset) => ({ assetId: asset.id })) : []
        }
      },
      include: { items: { include: { asset: true } } }
    });

    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'archive_package.create',
      entity: 'archive_package',
      entityId: ready.id,
      metadata: { projectId: input.projectId, type: input.data.type }
    });
    return ready;
  }

  async downloadIntent(input: { tenantId: string; packageId: string }) {
    const pkg = await this.prisma.archivePackage.findFirst({
      where: { id: input.packageId, tenantId: input.tenantId }
    });
    if (!pkg?.objectKey) {
      throw new NotFoundException('Archive package not ready');
    }
    return {
      package: pkg,
      download: this.storage.createDownloadIntent({
        objectKey: pkg.objectKey,
        filename: `${pkg.title}.zip`
      })
    };
  }
}
