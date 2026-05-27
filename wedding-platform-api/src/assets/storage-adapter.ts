export type SignedUploadIntent = {
  objectKey: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
};

export type SignedPreviewIntent = {
  objectKey: string;
  previewUrl: string;
  method: 'GET';
  expiresAt: string;
};

export type StoredObject = {
  objectKey: string;
  bytes: Buffer;
  contentType: string;
};

export type SignedDownloadIntent = {
  objectKey: string;
  downloadUrl: string;
  method: 'GET';
  expiresAt: string;
};

export abstract class StorageAdapter {
  abstract createUploadIntent(input: {
    tenantId: string;
    projectId: string;
    assetId: string;
    filename: string;
    contentType: string;
  }): SignedUploadIntent;

  abstract createPreviewIntent(input: {
    objectKey: string;
  }): SignedPreviewIntent;

  abstract putObject(input: StoredObject): Promise<{ objectKey: string; sizeBytes: number }>;
  abstract getObject(input: { objectKey: string }): Promise<StoredObject | null>;
  abstract createDownloadIntent(input: { objectKey: string; filename: string }): SignedDownloadIntent;
}
