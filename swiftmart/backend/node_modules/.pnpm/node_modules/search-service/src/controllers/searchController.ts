// backend/search-service/src/controllers/searchController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import prisma from '../db';
import { config } from '../config';
import { createClient } from 'redis';

const redisClient = createClient({ url: config.redisUrl });
redisClient.connect().catch(console.error);

// @desc    Internal endpoint to refresh the entire search index
// @route   POST /api/search/index/refresh
// @access  Internal (Admin/Scheduled Job Only)
export const refreshIndex = async (req: Request, res: Response) => {
  try {
    // 1. Fetch all products from Catalog Service
    const productsResponse = await axios.get(`${config.productCatalogServiceUrl}/products/all`);
    const products = (productsResponse.data as { products: any[] }).products;

    if (!products || products.length === 0) {
      return res.status(200).json({ message: 'No products found to index.' });
    }

    // 2. Fetch inventory for all products
    const productIds = products.map((p: any) => p._id);
    const inventoryResponse = await axios.post(`${config.inventoryServiceUrl}/inventory/lookup`, { productIds });
    const inventoryMap: { [key: string]: number } = (inventoryResponse.data as { inventory: any[] }).inventory.reduce((acc: any, item: any) => {
      acc[item.productId] = item.stock;
      return acc;
    }, {});

    const upsertPromises = products.map(async (product: any) => {
      const tags = [...product.tags, product.category, product.name.toLowerCase().split(' ')].flat();

      const existing = await prisma.searchIndex.findFirst({
        where: { productId: product._id },
      });

      if (existing) {
        return prisma.searchIndex.update({
          where: { id: existing.id },
          data: {
            name: product.name,
            category: product.category,
            tags: Array.from(new Set(tags.filter(Boolean))),
          },
        });
      } else {
        return prisma.searchIndex.create({
          data: {
            productId: product._id,
            name: product.name,
            category: product.category,
            tags: Array.from(new Set(tags.filter(Boolean))),
          },
        });
      }
    });

    const results = await Promise.all(upsertPromises);

    res.status(200).json({
      message: 'Search index refreshed successfully.',
      details: {
        indexedCount: results.length,
        productsCount: products.length,
      },
    });
  } catch (error) {
    console.error('Error refreshing search index:', (error as any).response?.data || error);
    res.status(500).json({ message: 'Server error during index refresh.' });
  }
};

// @desc    Perform full-text search and filtering
// @route   GET /api/search
// @access  Public
export const searchProducts = async (req: Request, res: Response) => {
  const { q, category, minPrice, maxPrice, sortBy, sortOrder = 'desc', page = 1, limit = 20 } = req.query;

  const cacheKey = `search:${JSON.stringify({ q, category, minPrice, maxPrice, sortBy, sortOrder, page, limit })}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }
  } catch (error) {
    console.error('Redis get error:', error);
  }

  const where: any = {};
  const orderBy: any = {};

  // 1. Full-Text Search (approximate using ILIKE on name and tags)
  if (q && typeof q === 'string') {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { tags: { has: q } },
    ];
  }

  // 2. Category Filter
  if (category && typeof category === 'string' && category !== 'all') {
    where.category = category;
  }

  // Note: Price and availability filters removed as fields not in schema

  // 3. Sorting Logic
  const order = sortOrder === 'asc' ? 'asc' : 'desc';
  switch (sortBy) {
    case 'name':
      orderBy.name = order;
      break;
    case 'latest':
    default:
      orderBy.createdAt = 'desc';
      break;
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  try {
    const [products, totalCount] = await Promise.all([
      prisma.searchIndex.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.searchIndex.count({ where }),
    ]);

    const results = products.map(p => p);

    const responseData = {
      message: 'Search results fetched successfully.',
      query: { q: q || '', category: category || 'all', sortBy: sortBy || 'latest', total: totalCount },
      products: results,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string)),
        totalResults: totalCount,
      }
    };

    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));
    } catch (error) {
      console.error('Redis set error:', error);
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error performing product search:', error);
    res.status(500).json({ message: 'Server error during search operation.' });
  }
};
