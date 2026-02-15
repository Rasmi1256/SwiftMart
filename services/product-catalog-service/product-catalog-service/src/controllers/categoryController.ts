import { Request, Response } from 'express';
import { prisma } from 'database'; // Adjust your import path
import { config } from '../config'; // Adjust your import path
import { createClient } from 'redis';

const redisClient = createClient({ url: config.redisUrl });
redisClient.connect().catch(console.error);

const CACHE_TTL = 3600; // 1 hour

// Helper: Consistent Slug Generation
const generateSlug = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') 
    .replace(/^-+|-+$/g, '');
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Admin
export const createCategory = async (req: Request, res: Response) => {
  const { name, description, imageUrl, parentCategory } = req.body;

  if (!name) {
    res.status(400).json({ message: 'Category name is required.' });
    return;
  }

  try {
    const slug = generateSlug(name);
    
    const categoryExists = await prisma.category.findFirst({
      where: {
        OR: [{ name }, { slug }]
      }
    });

    if (categoryExists) {
      res.status(400).json({ message: 'Category with this name or slug already exists.' });
      return;
    }

    if (parentCategory) {
      const parentExists = await prisma.category.findUnique({ where: { id: parentCategory } });
      if (!parentExists) {
        res.status(400).json({ message: 'Parent category not found.' });
        return;
      }
    }

    const createdCategory = await prisma.category.create({
      data: {
        name,
        description,
        imageUrl,
        slug,
        parentCategoryId: parentCategory || null, 
      }
    });

    // Invalidate Cache
    await redisClient.del('categories:all');
    if (!parentCategory) {
      await redisClient.del('categories:root');
    }

    res.status(201).json({
      message: 'Category created successfully',
      category: createdCategory,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server error creating category.' });
  }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req: Request, res: Response) => {
  const { parentId, isRoot } = req.query;
  const cacheKey = parentId ? `categories:parent:${parentId}` : isRoot === 'true' ? 'categories:root' : 'categories:all';

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }
  } catch (error) {
    console.error('Redis get error:', error);
  }

  try {
    const whereClause = parentId ? { parentCategoryId: parentId as string } : isRoot === 'true' ? { parentCategoryId: null } : {};

    const categories = await prisma.category.findMany({
      where: whereClause,
      include: {
        parentCategory: {
          select: {
            name: true,
            slug: true
          }
        },
        _count: {
          select: { 
            products: true,
            children: true // FIXED: Matches your schema `children`
          } 
        }
      },
      orderBy: { name: 'asc' }
    });

    const response = {
      message: 'Categories fetched successfully',
      categories
    };

    try {
      await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(response));
    } catch (error) {
      console.error('Redis set error:', error);
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error fetching categories.' });
  }
};

// @desc    Get category by ID or slug
// @route   GET /api/categories/:identifier
// @access  Public
export const getCategoryByIdentifier = async (req: Request, res: Response) => {
  const { identifier } = req.params;
  const cacheKey = `category:${identifier}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }
  } catch (error) {
    console.error('Redis get error:', error);
  }

  try {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);
    
    const category = await prisma.category.findFirst({
      where: isUuid ? { id: identifier } : { slug: identifier },
      include: {
        parentCategory: {
          select: { name: true, slug: true }
        },
        children: { // FIXED: Matches your schema `children`
          select: { id: true, name: true, slug: true, imageUrl: true }
        }
      }
    });

    if (!category) {
      res.status(404).json({ message: 'Category not found.' });
      return;
    }

    try {
      await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(category));
    } catch (error) {
      console.error('Redis set error:', error);
    }

    res.status(200).json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Server error fetching category.' });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Admin
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, imageUrl, parentCategory } = req.body;

  try {
    const existingCategory = await prisma.category.findUnique({ where: { id } });

    if (!existingCategory) {
      res.status(404).json({ message: 'Category not found.' });
      return;
    }

    let updateData: any = {};
    
    if (name && name !== existingCategory.name) {
      const slug = generateSlug(name);
      const categoryExists = await prisma.category.findFirst({
        where: {
          OR: [{ name }, { slug }],
          NOT: { id }
        }
      });
      if (categoryExists) {
        res.status(400).json({ message: 'Another category with this name or slug already exists.' });
        return;
      }
      updateData.name = name;
      updateData.slug = slug;
    }

    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    
    if (parentCategory !== undefined) {
        if (parentCategory === id) {
             res.status(400).json({ message: 'A category cannot be its own parent.' });
             return;
        }
        updateData.parentCategoryId = parentCategory;
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData
    });

    await Promise.all([
      redisClient.del('categories:all'),
      redisClient.del('categories:root'),
      redisClient.del(`category:${id}`),
      redisClient.del(`category:${existingCategory.slug}`)
    ]);

    res.status(200).json({
      message: 'Category updated successfully',
      category: updatedCategory,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error updating category.' });
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Admin
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
      res.status(404).json({ message: 'Category not found.' });
      return;
    }

    // 1. Check for linked Products (Main Category)
    const productCount = await prisma.product.count({
      where: {
        OR: [
          { categoryId: id },
          { subCategoryId: id }
        ]
      }
    });

    if (productCount > 0) {
      res.status(400).json({ message: 'Cannot delete category containing products.' });
      return;
    }

    // 2. Check for linked Sub-Categories (using parentCategoryId from schema)
    const childCategoryCount = await prisma.category.count({
      where: { parentCategoryId: id }
    });

    if (childCategoryCount > 0) {
      res.status(400).json({ message: 'Cannot delete category that has sub-categories. Please move or delete them first.' });
      return;
    }

    await prisma.category.delete({ where: { id } });

    await Promise.all([
      redisClient.del('categories:all'),
      redisClient.del(`category:${id}`),
      redisClient.del(`category:${category.slug}`)
    ]);

    res.status(200).json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error deleting category.' });
  }
};