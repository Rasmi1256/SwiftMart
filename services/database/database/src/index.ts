import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client';

// 1. Set up the connection pool using your environment variable
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

// 2. Initialize the adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to PrismaClient (MANDATORY in v7)
const prisma = new PrismaClient({ adapter });

export { prisma };

// Export types so User-Service stays type-safe
export * from '../src/generated/client';