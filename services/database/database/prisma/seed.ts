import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../database/src/generated/client';

// 1. Set up the connection pool using your environment variable
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

// 2. Initialize the adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to PrismaClient (MANDATORY in v7)
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create the ROOT Category (Electronics)
  // The critical part is parentCategoryId: null
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Gadgets and devices',
      imageUrl: 'https://example.com/electronics.jpg',
      parentCategoryId: null, 
    },
  });

  console.log(`✅ Created Root Category: ${electronics.name}`);

  // 2. Create a SUB-Category (Laptops)
  // We link it to the Electronics ID
  const laptops = await prisma.category.upsert({
    where: { slug: 'laptops' },
    update: {},
    create: {
      name: 'Laptops',
      slug: 'laptops',
      description: 'High performance laptops',
      parentCategoryId: electronics.id,
    },
  });

  console.log(`✅ Created Subcategory: ${laptops.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
