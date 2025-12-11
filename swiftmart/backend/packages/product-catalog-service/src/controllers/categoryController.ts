import { Request, Response } from 'express';
import prisma from '../db';
// @desc    Create a new category
// @route   POST /api/categories
// @access  Admin (would add auth middleware here)
export const createCategory = async (req: Request, res: Response) => {
  const { name, description, imageUrl, parentCategory } = req.body;

  if (!name) {
    res.status(400).json({ message: 'Category name is required.' });
    return;
  }

  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const categoryExists = await prisma.category.findFirst({
      where: {
        OR: [{ name }, { slug }]
      }
    });

    if (categoryExists) {
       res.status(400).json({ message: 'Category with this name or slug already exists.' });
       return;
    }

    const createdCategory = await prisma.category.create({
      data: {
        name,
        description,
        imageUrl,
        slug,
        parentCategoryId: parentCategory || undefined, // Ensure it's undefined if not provided
      }
    });
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
  try {
    const categories = await prisma.category.findMany({
      include: {
        parentCategory: {
          select: {
            name: true,
            slug: true
          }
        }
      }
    });
    res.status(200).json(categories);
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
  try {
    let category;
    if (identifier.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) { // Check if it's a valid UUID
      category = await prisma.category.findUnique({
        where: { id: identifier },
        include: {
          parentCategory: {
            select: {
              name: true,
              slug: true
            }
          }
        }
      });
    } else {
      category = await prisma.category.findFirst({
        where: { slug: identifier },
        include: {
          parentCategory: {
            select: {
              name: true,
              slug: true
            }
          }
        }
      });
    }

    if (!category) {
        res.status(404).json({ message: 'Category not found.' });
        return;
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
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
       res.status(404).json({ message: 'Category not found.' });
       return;
    }

    let updateData: any = {};
    if (name) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
    if (parentCategory !== undefined) updateData.parentCategoryId = parentCategory;

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData
    });
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
    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
       res.status(404).json({ message: 'Category not found.' });
         return;
    }

    // Check if any products are linked to this category
    const productCount = await prisma.product.count({
      where: {
        OR: [
          { categoryId: id },
          { subCategoryId: id }
        ]
      }
    });
    if (productCount > 0) {
       res.status(400).json({ message: 'Cannot delete category with associated products.' });
         return;
    }

    await prisma.category.delete({
      where: { id }
    });
    res.status(200).json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error deleting category.' });
  }
};
