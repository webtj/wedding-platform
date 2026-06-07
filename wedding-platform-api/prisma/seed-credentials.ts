/**
 * Seed credentials are read from env vars with safe dev defaults.
 *
 * For production or shared environments, ALWAYS set:
 *   SEED_ROOT_PASSWORD=<strong-password>
 *   SEED_NATURE_PASSWORD=<strong-password>
 *
 * The defaults below are well-known and MUST NOT be used in any
 * non-local environment.
 */
export const SEED_ROOT_PASSWORD = process.env.SEED_ROOT_PASSWORD ?? 'root123456';
export const SEED_NATURE_PASSWORD = process.env.SEED_NATURE_PASSWORD ?? 'nature123456';

export function warnIfUsingDefaultSeedPasswords(): void {
  if (SEED_ROOT_PASSWORD === 'root123456' || SEED_NATURE_PASSWORD === 'nature123456') {
    console.warn(
      '[seed] Using default seed passwords. Set SEED_ROOT_PASSWORD and SEED_NATURE_PASSWORD env vars for production-like seeding.'
    );
  }
}
