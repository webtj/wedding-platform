import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  StorageAdapter,
  type SignedDownloadIntent,
  type SignedPreviewIntent,
  type SignedUploadIntent,
  type StoredObject
} from './storage-adapter';

/**
 * WARNING: This adapter does NOT implement proper COS signing.
 * URLs are returned unsigned - bucket must be publicly accessible.
 * For production, use @cos-nodejs-sdk/client for signed URLs.
 */
@Injectable()
export class CosStorageAdapter extends StorageAdapter {
  private readonly bucket: string;
  private readonly region: string;
  private readonly secretId: string;
  private readonly secretKey: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.bucket = this.config.getOrThrow<string>('COS_BUCKET');
    this.region = this.config.getOrThrow<string>('COS_REGION');
    this.secretId = this.config.getOrThrow<string>('COS_SECRET_ID');
    this.secretKey = this.config.getOrThrow<string>('COS_SECRET_KEY');
  }

  private getObjectUrl(objectKey: string): string {
    return `https://${this.bucket}.cos.${this.region}.myqcloud.com/${objectKey}`;
  }

  createUploadIntent(input: { tenantId: string; projectId: string; assetId: string; filename: string; contentType: string }): SignedUploadIntent {
    const objectKey = `tenants/${input.tenantId}/projects/${input.projectId}/assets/${input.assetId}/${input.filename}`;
    return {
      objectKey,
      uploadUrl: this.getObjectUrl(objectKey),
      method: 'PUT',
      headers: { 'content-type': input.contentType },
      expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString()
    };
  }

  createPreviewIntent(input: { objectKey: string }): SignedPreviewIntent {
    return {
      objectKey: input.objectKey,
      previewUrl: this.getObjectUrl(input.objectKey),
      method: 'GET',
      expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString()
    };
  }

  async putObject(input: StoredObject) {
    const url = this.getObjectUrl(input.objectKey);
    await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': input.contentType },
      body: new Uint8Array(input.bytes)
    });
    return { objectKey: input.objectKey, sizeBytes: input.bytes.byteLength };
  }

  async getObject(input: { objectKey: string }) {
    const url = this.getObjectUrl(input.objectKey);
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      objectKey: input.objectKey,
      bytes,
      contentType: response.headers.get('content-type') ?? 'application/octet-stream'
    };
  }

  createDownloadIntent(input: { objectKey: string; filename: string }): SignedDownloadIntent {
    return {
      objectKey: input.objectKey,
      downloadUrl: this.getObjectUrl(input.objectKey),
      method: 'GET',
      expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString()
    };
  }
}
