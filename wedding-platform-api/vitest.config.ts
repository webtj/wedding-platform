import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts', 'prisma/**/*.spec.ts', 'packages/shared/src/**/*.spec.ts', 'packages/shared/src/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.module.ts',
        'src/**/*.controller.ts',
        'src/main.ts',
        'src/**/*.dto.ts',
        'src/**/*.dto/**',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/health/**'
      ]
    }
  }
});
