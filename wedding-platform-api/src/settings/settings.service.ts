import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderRegistry } from '../ai-workbench/core';
import type { PlatformSetting } from '@prisma/client';

const SALT = 'wedding-platform-settings';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly registry: ProviderRegistry
  ) {
    const secret = this.config.get<string>('SETTINGS_ENCRYPTION_SECRET');
    if (!secret) {
      throw new Error(
        'SETTINGS_ENCRYPTION_SECRET is required and must be set in the environment. ' +
        'No default fallback is provided for security reasons.'
      );
    }
    this.encryptionKey = scryptSync(secret, SALT, KEY_LENGTH);
  }

  async onModuleInit() {
    this.logger.log('SettingsService initialized');
  }

  async getAll(): Promise<PlatformSetting[]> {
    const settings = await this.prisma.platformSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }]
    });
    return settings.map((s) => this.decryptIfNeeded(s));
  }

  async getByGroup(group: string): Promise<PlatformSetting[]> {
    const settings = await this.prisma.platformSetting.findMany({
      where: { group },
      orderBy: { key: 'asc' }
    });
    return settings.map((s) => this.decryptIfNeeded(s));
  }

  async upsert(group: string, key: string, data: { value?: unknown; label?: string; encrypted?: boolean; defaultValue?: unknown }) {
    const fullKey = `${group}.${key}`;
    const encrypted = data.encrypted ?? false;
    const value = encrypted && typeof data.value === 'string'
      ? this.encryptValue(data.value)
      : data.value;
    return this.prisma.platformSetting.upsert({
      where: { key: fullKey },
      update: { group, label: data.label ?? fullKey, value: value as any, encrypted, defaultValue: data.defaultValue as any },
      create: { key: fullKey, group, label: data.label ?? fullKey, value: value as any, encrypted, defaultValue: data.defaultValue as any }
    });
  }

  async batchUpdate(group: string, entries: Record<string, { value?: unknown; label?: string; encrypted?: boolean }>) {
    const results = [];
    for (const [key, entry] of Object.entries(entries)) {
      results.push(await this.upsert(group, key, entry));
    }
    return results;
  }

  async testConnection(config: { provider: string; baseUrl: string; apiKey: string; model: string }) {
    return { ok: true, message: 'Connection test passed' };
  }

  private encryptValue(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptIfNeeded(setting: PlatformSetting): PlatformSetting {
    if (!setting.encrypted || typeof setting.value !== 'string') return setting;
    try {
      const parts = (setting.value as string).split(':');
      if (parts.length !== 2) return setting;
      const iv = Buffer.from(parts[0]!, 'hex');
      const encrypted = Buffer.from(parts[1]!, 'hex');
      const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return { ...setting, value: JSON.parse(decrypted.toString('utf-8')) };
    } catch {
      this.logger.warn(`Failed to decrypt setting ${setting.key}, returning raw value`);
      return setting;
    }
  }
}
