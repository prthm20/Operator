import { defineConfig } from '@prisma/config'
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});