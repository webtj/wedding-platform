import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  it('hashes and verifies a password', { timeout: 15000 }, async () => {
    const service = new PasswordService();
    const hash = await service.hash('admin');

    expect(hash).not.toBe('admin');
    await expect(service.verify('admin', hash)).resolves.toBe(true);
    await expect(service.verify('wrong', hash)).resolves.toBe(false);
  });
});
