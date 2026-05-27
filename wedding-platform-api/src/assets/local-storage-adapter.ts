import { Injectable } from '@nestjs/common';
import { StorageAdapter, type SignedPreviewIntent, type SignedUploadIntent, type StoredObject, type SignedDownloadIntent } from './storage-adapter';

const memoryStore = new Map<string, StoredObject>();

@Injectable()
export class LocalStorageAdapter extends StorageAdapter {
  createUploadIntent(input: {
    tenantId: string;
    projectId: string;
    assetId: string;
    filename: string;
    contentType: string;
  }): SignedUploadIntent {
    const objectKey = `tenants/${input.tenantId}/projects/${input.projectId}/assets/${input.assetId}/original`;
    return {
      objectKey,
      uploadUrl: `http://localhost:4000/local-upload-placeholder/${encodeURIComponent(objectKey)}`,
      method: 'PUT',
      headers: {
        'content-type': input.contentType
      },
      expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString()
    };
  }

  createPreviewIntent(input: { objectKey: string }): SignedPreviewIntent {
    return {
      objectKey: input.objectKey,
      previewUrl: `http://localhost:4000/local-preview-placeholder/${encodeURIComponent(input.objectKey)}`,
      method: 'GET',
      expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString()
    };
  }

  async putObject(input: StoredObject) {
    memoryStore.set(input.objectKey, input);
    return { objectKey: input.objectKey, sizeBytes: input.bytes.byteLength };
  }

  async getObject(input: { objectKey: string }) {
    return memoryStore.get(input.objectKey) ?? null;
  }

  createDownloadIntent(input: { objectKey: string; filename: string }): SignedDownloadIntent {
    return {
      objectKey: input.objectKey,
      downloadUrl: `http://localhost:4000/local-download-placeholder/${encodeURIComponent(input.objectKey)}?filename=${encodeURIComponent(input.filename)}`,
      method: 'GET',
      expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString()
    };
  }
}
