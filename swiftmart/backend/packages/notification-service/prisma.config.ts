import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

type Env = {
  DATABASE_URL: string;
};

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // No `db` key here – just `url`
    url: env<Env>('DATABASE_URL'),
    // optional: shadowDatabaseUrl: env<Env>('SHADOW_DATABASE_URL'),
  },
});
