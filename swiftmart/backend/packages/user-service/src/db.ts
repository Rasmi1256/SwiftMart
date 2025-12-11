
// File: db.ts (or similar)
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// --- 🛠️ FIX APPLIED HERE: Validate DATABASE_URL existence ---
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    // Fail immediately if the critical environment variable is missing
    throw new Error(
        'FATAL: DATABASE_URL environment variable is not set. ' +
        'Please ensure your .env file is loaded and the variable is defined.'
    );
}

// -------------------------------------------------------------

// Use the validated databaseUrl variable
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;