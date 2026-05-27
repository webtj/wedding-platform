import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: 'schema.prisma',
  migrate: {
    async url() {
      return process.env.DATABASE_URL ?? '';
    },
  },
});
