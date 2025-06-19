import { Request, Response } from 'express';
import Product from '../models/Product';
import Category from '../models/Category'; // To validate category IDs
import mongoose from 'mongoose';

// @desc    Create a new product
// @route   POST /api/products
// @access  Admin (would add auth middleware here)
export const createProduct = async (req: Request, res: Response) => {
  const {
    name, description, price, unit, category, subCategory, brand, SKU, imageUrl,
    thumbnailUrl, nutritionalInfo, weight, dimensions, tags, isAvailable
  } = req.body;

  if (!name || !description || !price || !unit || !category || !SKU || !imageUrl) {
    res.status(400).json({ message: 'Please fill all required product fields.' });
    return;
  }

  // Validate category and subCategory ID format before querying
  if (!mongoose.Types.ObjectId.isValid(category)) {
    res.status(400).json({ message: 'Invalid category ID format.' });
    return;
  }
  if (subCategory && !mongoose.Types.ObjectId.isValid(subCategory)) {
    res.status(400).json({ message: 'Invalid sub-category ID format.' });
    return;
  }

  try {
    // Validate category existence
    const existingCategory = await Category.findById(category);
    if (!existingCategory) {
       res.status(400).json({ message: 'Invalid category ID provided.' });
        return;
    }
    if (subCategory) {
      const existingSubCategory = await Category.findById(subCategory);
      if (!existingSubCategory || existingSubCategory.parentCategory?.toString() !== category) {
         res.status(400).json({ message: 'Invalid sub-category ID or not a child of the main category.' });
            return;
      }
    }

    const productExists = await Product.findOne({ SKU });
    if (productExists) {
     res.status(400).json({ message: 'Product with this SKU already exists.' });
        return;
    }

    const product = new Product({
      name, description, price, unit, category, subCategory, brand, SKU, imageUrl,
      thumbnailUrl, nutritionalInfo, weight, dimensions, tags, isAvailable
    });

    const createdProduct = await product.save();
    res.status(201).json({
      message: 'Product created successfully',
      product: createdProduct,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error creating product.' });
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req: Request, res: Response) => {
  const { search, category, minPrice, maxPrice, brand, sortBy, order, limit = 10, page = 1 } = req.query;

  const query: any = {};
  const options: any = {
    limit: parseInt(limit as string),
    skip: (parseInt(page as string) - 1) * parseInt(limit as string),
    sort: {}
  };

  // Search functionality (text search)
  if (search) {
    query.$text = { $search: search as string };
  }

  // Category filtering
  if (category) {
    try {
      const categoryDoc = await Category.findOne({ $or: [{ _id: category as string }, { slug: category as string }] });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      } else {
         res.status(404).json({ message: 'Category not found for filtering.' });
        return;
      }
    } catch (error) {
     res.status(400).json({ message: 'Invalid category ID or slug.' });
        return;
    }
  }

  // Price filtering
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice as string);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice as string);
  }

  // Brand filtering
  if (brand) {
    query.brand = brand as string;
  }

  // Sorting
  if (sortBy) {
    options.sort[sortBy as string] = order === 'desc' ? -1 : 1;
  } else {
    options.sort.createdAt = -1; // Default sort by newest
  }

  try {
    const products = await Product.find(query)
      .populate('category', 'name slug') // Populate category name and slug
      .populate('subCategory', 'name slug') // Populate sub-category name and slug
      .limit(options.limit)
      .skip(options.skip)
      .sort(options.sort);

    const totalProducts = await Product.countDocuments(query);

    res.status(200).json({
      products,
      totalProducts,
      currentPage: parseInt(page as string),
      totalPages: Math.ceil(totalProducts / options.limit),
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error fetching products.' });
  }
};

// @desc    Get a single product by ID or SKU
// @route   GET /api/products/:identifier
// @access  Public
export const getProductByIdentifier = async (req: Request, res: Response) => {
  const { identifier } = req.params;
  try {
    let product;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) { // Check if it's a valid MongoDB ObjectId
      product = await Product.findById(identifier)
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug');
    } else {
      product = await Product.findOne({ SKU: identifier })
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug');
    }

    if (!product) {
       res.status(404).json({ message: 'Product not found.' });
        return;
    }
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error fetching product.' });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Admin
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name, description, price, unit, category, subCategory, brand, SKU, imageUrl,
    thumbnailUrl, nutritionalInfo, weight, dimensions, tags, isAvailable
  } = req.body;

  try {
    const product = await Product.findById(id);

    if (!product) {
       res.status(404).json({ message: 'Product not found.' });
        return;
    }

    // Validate category existence if provided
    if (category) {
      const existingCategory = await Category.findById(category);
      if (!existingCategory) {
         res.status(400).json({ message: 'Invalid category ID provided.' });
        return;
      }
    }
    if (subCategory) {
      const existingSubCategory = await Category.findById(subCategory);
      if (!existingSubCategory || (category && existingSubCategory.parentCategory?.toString() !== category)) {
        res.status(400).json({ message: 'Invalid sub-category ID or not a child of the main category.' });
        return;
      }
    }

    // Check for duplicate SKU if SKU is being updated
    if (SKU && SKU !== product.SKU) {
      const skuExists = await Product.findOne({ SKU });
      if (skuExists) {
         res.status(400).json({ message: 'Another product with this SKU already exists.' });
        return;
      }
    }

    // Update product fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.unit = unit || product.unit;
    product.category = category || product.category;
    product.subCategory = subCategory || product.subCategory;
    product.brand = brand || product.brand;
    product.SKU = SKU || product.SKU;
    product.imageUrl = imageUrl || product.imageUrl;
    product.thumbnailUrl = thumbnailUrl !== undefined ? thumbnailUrl : product.thumbnailUrl;
    product.nutritionalInfo = nutritionalInfo !== undefined ? nutritionalInfo : product.nutritionalInfo;
    product.weight = weight !== undefined ? weight : product.weight;
    product.dimensions = dimensions !== undefined ? dimensions : product.dimensions;
    product.tags = tags !== undefined ? tags : product.tags;
    product.isAvailable = isAvailable !== undefined ? isAvailable : product.isAvailable;

    const updatedProduct = await product.save();
    res.status(200).json({
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error updating product.' });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Admin
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);

    if (!product) {
       res.status(404).json({ message: 'Product not found.' });
        return;
    }

    await product.deleteOne(); // Use deleteOne() for Mongoose 6+
    res.status(200).json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error deleting product.' });
  }
};