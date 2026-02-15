import 'dotenv/config';
import { defineConfig } from '@prisma/config';

export default defineConfig({
  migrations: {
    // This tells Prisma how to run your seed file
    seed: 'npx tsx prisma/seed.ts',
  },
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});