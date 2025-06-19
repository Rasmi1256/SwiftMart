import { Request, Response } from 'express';
import Category from '../models/Category';

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
    const categoryExists = await Category.findOne({ $or: [{ name }, { slug }] });

    if (categoryExists) {
       res.status(400).json({ message: 'Category with this name or slug already exists.' });
       return;
    }

    const category = new Category({
      name,
      description,
      imageUrl,
      slug,
      parentCategory: parentCategory || undefined, // Ensure it's undefined if not provided
    });

    const createdCategory = await category.save();
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
    const categories = await Category.find().populate('parentCategory', 'name slug'); // Populate parent category name/slug
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
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) { // Check if it's a valid MongoDB ObjectId
      category = await Category.findById(identifier).populate('parentCategory', 'name slug');
    } else {
      category = await Category.findOne({ slug: identifier }).populate('parentCategory', 'name slug');
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
    const category = await Category.findById(id);

    if (!category) {
       res.status(404).json({ message: 'Category not found.' });
       return;
    }

    if (name) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const categoryExists = await Category.findOne({ $or: [{ name }, { slug }], _id: { $ne: id } });
      if (categoryExists) {
         res.status(400).json({ message: 'Another category with this name or slug already exists.' });
         return;
      }
      category.name = name;
      category.slug = slug;
    }
    if (description !== undefined) category.description = description;
    if (imageUrl !== undefined) category.imageUrl = imageUrl;
    if (parentCategory !== undefined) category.parentCategory = parentCategory;


    const updatedCategory = await category.save();
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
    const category = await Category.findById(id);

    if (!category) {
       res.status(404).json({ message: 'Category not found.' });
         return;
    }

    // Check if any products are linked to this category
    const productCount = await Category.countDocuments({ category: id });
    if (productCount > 0) {
       res.status(400).json({ message: 'Cannot delete category with associated products.' });
         return;
    }

    await category.deleteOne(); // Use deleteOne() for Mongoose 6+
    res.status(200).json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error deleting category.' });
  }
};