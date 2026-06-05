import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn()
  },
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn()
}));

import * as fs from 'fs';
import { ObjectStorageService } from './object-storage.service';

const buildConfig = (overrides: Record<string, string> = {}) => ({
  get: vi.fn((key: string, fallback?: string) => overrides[key] ?? fallback)
});

describe('ObjectStorageService', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockClear();
    vi.mocked(fs.writeFileSync).mockClear();
    vi.mocked(fs.readFileSync).mockClear();
    vi.mocked(fs.unlinkSync).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates the storage directory on init when missing', () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);
    new ObjectStorageService(buildConfig() as never);
    expect(fs.mkdirSync).toHaveBeenCalledWith('./uploads', { recursive: true });
  });

  it('uploads a buffer, returns url/key/size with tenant-scoped key', async () => {
    const service = new ObjectStorageService(
      buildConfig({ STORAGE_PATH: '/tmp/uploads', STORAGE_BASE_URL: 'http://api/uploads' }) as never
    );
    const buf = Buffer.from('hello world');

    const result = await service.upload(buf, 'photo.png', 'image/png', 'tenant_1');

    expect(result.size).toBe(11);
    expect(result.key).toMatch(/^tenant_1\/[a-f0-9-]+\.png$/);
    expect(result.url).toBe(`http://api/uploads/${result.key}`);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('uploads falls back to .png when filename has no extension', async () => {
    const service = new ObjectStorageService(buildConfig() as never);
    const result = await service.upload(Buffer.from('x'), 'noext', 'image/png', 't1');
    expect(result.key).toMatch(/\.png$/);
  });

  it('creates subdirectory on first upload to a new tenant folder', async () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(true).mockReturnValueOnce(false);
    const service = new ObjectStorageService(buildConfig() as never);
    await service.upload(Buffer.from('x'), 'a.png', 'image/png', 't1');
    expect(fs.mkdirSync).toHaveBeenCalled();
  });

  it('download reads file by key and returns buffer', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('bytes') as never);
    const service = new ObjectStorageService(buildConfig() as never);
    const buf = await service.download('tenant_1/abc.png');
    expect(buf.toString()).toBe('bytes');
    expect(fs.readFileSync).toHaveBeenCalled();
  });

  it('download throws when file does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const service = new ObjectStorageService(buildConfig() as never);
    await expect(service.download('missing.png')).rejects.toThrow('File not found: missing.png');
  });

  it('delete unlinks the file when present', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const service = new ObjectStorageService(buildConfig() as never);
    await service.delete('k.png');
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it('delete is a noop when the file is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const service = new ObjectStorageService(buildConfig() as never);
    await service.delete('k.png');
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it('getUrl composes the public URL for a key', () => {
    const service = new ObjectStorageService(
      buildConfig({ STORAGE_BASE_URL: 'http://api/uploads' }) as never
    );
    expect(service.getUrl('tenant_1/abc.png')).toBe('http://api/uploads/tenant_1/abc.png');
  });
});
