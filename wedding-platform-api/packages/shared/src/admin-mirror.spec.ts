import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Drift detector: the admin app mirrors PERMISSION_METADATA and the 5
 * ROLE_TEMPLATES into its own src/lib so the UI can render human-readable
 * labels without crossing the API boundary. Until the monorepo is set up
 * to consume @wedding/shared directly, this test is the structural
 * guarantee that the two stay in lockstep.
 *
 * If a permission code is added to shared/permissions.ts, the same key
 * MUST be added to admin/lib/permissions.ts in the same shape, or this
 * test fails. The test is read-only (reads both files, asserts key sets
 * are equal) so it does not couple the API test runner to the admin
 * build.
 */
describe('admin/lib mirrors shared (drift detector)', () => {
  const repoRoot = resolve(__dirname, '../../../..');
  const adminPermissionsPath = resolve(
    repoRoot,
    'wedding-platform-admin/src/lib/permissions.ts'
  );
  const sharedPermissionsPath = resolve(__dirname, 'permissions.ts');

  const shared = readFileSync(sharedPermissionsPath, 'utf8');
  const admin = readFileSync(adminPermissionsPath, 'utf8');

  it('admin/lib/permissions.ts declares the same PERMISSION_METADATA keys as shared/permissions.ts', () => {
    // Match `"code.name"` style keys inside PERMISSION_METADATA blocks.
    // We don't import either file (admin is a Next.js project; this is the
    // API test runner) — we read them as text and look up code-shaped
    // string literals in each declaration.
    const extractKeys = (text: string): Set<string> => {
      const keys = new Set<string>();
      // Match strings of the shape "x.y" or "x.y.z" inside PERMISSION_METADATA
      const blockMatch = text.match(
        /PERMISSION_METADATA[^=]*=\s*{([\s\S]*?)\n}\s*(?:as|\)|;)/
      );
      if (!blockMatch) {
        throw new Error('Could not locate PERMISSION_METADATA block');
      }
      const block = blockMatch[1]!;
      const keyRe = /['"`]([a-z][a-z0-9_]*\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)?)['"`]/g;
      let m: RegExpExecArray | null;
      while ((m = keyRe.exec(block)) !== null) keys.add(m[1]!);
      return keys;
    };

    const sharedKeys = extractKeys(shared);
    const adminKeys = extractKeys(admin);

    // Sanity: shared should declare at least 30 permissions.
    expect(sharedKeys.size, 'shared PERMISSION_METADATA has suspiciously few keys').toBeGreaterThan(30);

    // No keys missing in either direction.
    const onlyInShared = [...sharedKeys].filter((k) => !adminKeys.has(k));
    const onlyInAdmin = [...adminKeys].filter((k) => !sharedKeys.has(k));
    expect(onlyInShared, `Admin is missing keys: ${onlyInShared.join(', ')}`).toEqual([]);
    expect(onlyInAdmin, `Shared is missing keys: ${onlyInAdmin.join(', ')}`).toEqual([]);
  });
});
