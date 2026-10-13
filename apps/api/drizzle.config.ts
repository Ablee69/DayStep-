import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './migrations',
  dbCredentials: { url: process.env.DATABASE_URL || 'mysql://daystep:change-me@127.0.0.1:3306/daystep' },
});
