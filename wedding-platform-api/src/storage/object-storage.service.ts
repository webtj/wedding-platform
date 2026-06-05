import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly storagePath: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.storagePath = this.config.get<string>('STORAGE_PATH', './uploads');
    this.baseUrl = this.config.get<string>('STORAGE_BASE_URL', 'http://localhost:4000/uploads');

    // Ensure storage directory exists
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  async upload(
    buffer: Buffer,
    filename: string,
    contentType: string,
    tenantId: string,
  ): Promise<UploadResult> {
    const ext = path.extname(filename) || '.png';
    const key = `${tenantId}/${randomUUID()}${ext}`;
    const filePath = path.join(this.storagePath, key);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(filePath, buffer);

    return {
      url: `${this.baseUrl}/${key}`,
      key,
      size: buffer.length,
    };
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.storagePath, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    return fs.readFileSync(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.storagePath, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}
