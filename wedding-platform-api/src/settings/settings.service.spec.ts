import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';

const ORIGINAL_SECRET = process.env.SETTINGS_ENCRYPTION_SECRET;

beforeAll(() => {
  process.env.SETTINGS_ENCRYPTION_SECRET = 'test-secret-for-settings-encryption';
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SETTINGS_ENCRYPTION_SECRET;
  else process.env.SETTINGS_ENCRYPTION_SECRET = ORIGINAL_SECRET;
});

function makePrisma() {
  return {
    platformSetting: {
      findMany: vi.fn(),
      upsert: vi.fn()
    }
  };
}

function makeConfig() {
  return new ConfigService({
    SETTINGS_ENCRYPTION_SECRET: 'test-secret-for-settings-encryption'
  });
}

describe('SettingsService', () => {
  describe('constructor', () => {
    it('throws if SETTINGS_ENCRYPTION_SECRET is missing', () => {
      const prisma = makePrisma();
      const config = new ConfigService({});
      const saved = process.env.SETTINGS_ENCRYPTION_SECRET;
      delete process.env.SETTINGS_ENCRYPTION_SECRET;
      try {
        expect(() => new SettingsService(prisma as never, config as never, {} as never)).toThrow(
          /SETTINGS_ENCRYPTION_SECRET is required/
        );
      } finally {
        if (saved !== undefined) process.env.SETTINGS_ENCRYPTION_SECRET = saved;
      }
    });

    it('initializes when SETTINGS_ENCRYPTION_SECRET is set', () => {
      const prisma = makePrisma();
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);
      expect(service).toBeInstanceOf(SettingsService);
    });
  });

  describe('onModuleInit', () => {
    it('logs initialization', async () => {
      const prisma = makePrisma();
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('returns decrypted settings', async () => {
      const prisma = makePrisma();
      prisma.platformSetting.findMany.mockResolvedValue([
        { key: 'a.b', value: 'plain', encrypted: false, group: 'a' },
        { key: 'c.d', value: { foo: 'bar' }, encrypted: false, group: 'c' }
      ]);
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);

      const result = await service.getAll();
      expect(result).toHaveLength(2);
      expect(prisma.platformSetting.findMany).toHaveBeenCalledWith({
        orderBy: [{ group: 'asc' }, { key: 'asc' }]
      });
    });
  });

  describe('getByGroup', () => {
    it('queries by group', async () => {
      const prisma = makePrisma();
      prisma.platformSetting.findMany.mockResolvedValue([]);
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);

      await service.getByGroup('ai');
      expect(prisma.platformSetting.findMany).toHaveBeenCalledWith({
        where: { group: 'ai' },
        orderBy: { key: 'asc' }
      });
    });
  });

  describe('upsert', () => {
    it('upserts a plain value without encryption', async () => {
      const prisma = makePrisma();
      prisma.platformSetting.upsert.mockResolvedValue({ key: 'a.b' });
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);

      await service.upsert('a', 'b', { value: 'plain' });
      expect(prisma.platformSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'a.b' },
          update: expect.objectContaining({ encrypted: false }),
          create: expect.objectContaining({ key: 'a.b', encrypted: false })
        })
      );
    });

    it('encrypts a string value when encrypted=true', async () => {
      const prisma = makePrisma();
      prisma.platformSetting.upsert.mockResolvedValue({ key: 'a.b' });
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);

      await service.upsert('a', 'b', { value: 'secret', encrypted: true });

      const call = prisma.platformSetting.upsert.mock.calls[0]![0];
      const stored = call.update.value as string;
      expect(stored).toMatch(/^[a-f0-9]{32}:[a-f0-9]+$/);
      expect(call.update.encrypted).toBe(true);
    });

    it('does not encrypt non-string values even when encrypted=true', async () => {
      const prisma = makePrisma();
      prisma.platformSetting.upsert.mockResolvedValue({});
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);

      const obj = { foo: 'bar' };
      await service.upsert('a', 'b', { value: obj, encrypted: true });
      const call = prisma.platformSetting.upsert.mock.calls[0]![0];
      expect(call.update.value).toBe(obj);
    });
  });

  describe('batchUpdate', () => {
    it('upserts each entry sequentially', async () => {
      const prisma = makePrisma();
      prisma.platformSetting.upsert.mockResolvedValue({});
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);

      const result = await service.batchUpdate('ai', {
        model: { value: 'gpt-4o' },
        baseUrl: { value: 'https://api.openai.com' }
      });

      expect(result).toHaveLength(2);
      expect(prisma.platformSetting.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('testConnection', () => {
    it('returns ok without hitting prisma or registry', async () => {
      const prisma = makePrisma();
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);

      const result = await service.testConnection({
        provider: 'openai',
        baseUrl: 'https://api.openai.com',
        apiKey: 'sk-test',
        model: 'gpt-4o'
      });
      expect(result).toEqual({ ok: true, message: 'Connection test passed' });
    });
  });

  describe('encryptValue / decryptIfNeeded', () => {
    it('round-trips an encrypted value back to the original', async () => {
      const prisma = makePrisma();
      prisma.platformSetting.findMany.mockResolvedValue([
        { key: 'k', value: 'plain', encrypted: false, group: 'g' }
      ]);
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);

      const original = { apiKey: 'sk-test-1234' };
      const stored = (service as unknown as { encryptValue: (v: string) => string }).encryptValue(JSON.stringify(original));
      expect(stored).toMatch(/^[a-f0-9]{32}:[a-f0-9]+$/);

      const decrypted = (
        service as unknown as { decryptIfNeeded: (s: { key: string; value: unknown; encrypted: boolean; group: string }) => { value: unknown } }
      ).decryptIfNeeded({ key: 'k', value: stored, encrypted: true, group: 'g' });
      expect(decrypted.value).toEqual(original);
    });

    it('returns the setting as-is when not encrypted', async () => {
      const prisma = makePrisma();
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);

      const original = { key: 'k', value: { x: 1 }, encrypted: false, group: 'g' };
      const result = (
        service as unknown as { decryptIfNeeded: (s: typeof original) => typeof original }
      ).decryptIfNeeded(original);
      expect(result).toBe(original);
    });

    it('returns the setting as-is when value is not a string', async () => {
      const prisma = makePrisma();
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);

      const original = { key: 'k', value: { x: 1 }, encrypted: true, group: 'g' };
      const result = (
        service as unknown as { decryptIfNeeded: (s: typeof original) => typeof original }
      ).decryptIfNeeded(original);
      expect(result).toBe(original);
    });

    it('returns the setting as-is when encrypted value has wrong format', async () => {
      const prisma = makePrisma();
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);

      const original = { key: 'k', value: 'no-colon-here', encrypted: true, group: 'g' };
      const result = (
        service as unknown as { decryptIfNeeded: (s: typeof original) => typeof original }
      ).decryptIfNeeded(original);
      expect(result).toBe(original);
    });

    it('returns the setting as-is when decryption throws', async () => {
      const prisma = makePrisma();
      const config = makeConfig();
      const service = new SettingsService(prisma as never, config as never, {} as never);

      const original = { key: 'k', value: 'bad:hex', encrypted: true, group: 'g' };
      const result = (
        service as unknown as { decryptIfNeeded: (s: typeof original) => typeof original }
      ).decryptIfNeeded(original);
      expect(result).toBe(original);
    });
  });
});
