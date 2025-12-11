"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.getCategoryByIdentifier = exports.getCategories = exports.createCategory = void 0;
const db_1 = __importDefault(require("../db"));
// @desc    Create a new category
// @route   POST /api/categories
// @access  Admin (would add auth middleware here)
const createCategory = async (req, res) => {
    const { name, description, imageUrl, parentCategory } = req.body;
    if (!name) {
        res.status(400).json({ message: 'Category name is required.' });
        return;
    }
    try {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const categoryExists = await db_1.default.category.findFirst({
            where: {
                OR: [{ name }, { slug }]
            }
        });
        if (categoryExists) {
            res.status(400).json({ message: 'Category with this name or slug already exists.' });
            return;
        }
        const createdCategory = await db_1.default.category.create({
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
    }
    catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Server error creating category.' });
    }
};
exports.createCategory = createCategory;
// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
    try {
        const categories = await db_1.default.category.findMany({
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
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Server error fetching categories.' });
    }
};
exports.getCategories = getCategories;
// @desc    Get category by ID or slug
// @route   GET /api/categories/:identifier
// @access  Public
const getCategoryByIdentifier = async (req, res) => {
    const { identifier } = req.params;
    try {
        let category;
        if (identifier.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) { // Check if it's a valid UUID
            category = await db_1.default.category.findUnique({
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
        }
        else {
            category = await db_1.default.category.findFirst({
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
    }
    catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ message: 'Server error fetching category.' });
    }
};
exports.getCategoryByIdentifier = getCategoryByIdentifier;
// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Admin
const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description, imageUrl, parentCategory } = req.body;
    try {
        const existingCategory = await db_1.default.category.findUnique({
            where: { id }
        });
        if (!existingCategory) {
            res.status(404).json({ message: 'Category not found.' });
            return;
        }
        let updateData = {};
        if (name) {
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const categoryExists = await db_1.default.category.findFirst({
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
        if (description !== undefined)
            updateData.description = description;
        if (imageUrl !== undefined)
            updateData.imageUrl = imageUrl;
        if (parentCategory !== undefined)
            updateData.parentCategoryId = parentCategory;
        const updatedCategory = await db_1.default.category.update({
            where: { id },
            data: updateData
        });
        res.status(200).json({
            message: 'Category updated successfully',
            category: updatedCategory,
        });
    }
    catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Server error updating category.' });
    }
};
exports.updateCategory = updateCategory;
// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Admin
const deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const category = await db_1.default.category.findUnique({
            where: { id }
        });
        if (!category) {
            res.status(404).json({ message: 'Category not found.' });
            return;
        }
        // Check if any products are linked to this category
        const productCount = await db_1.default.product.count({
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
        await db_1.default.category.delete({
            where: { id }
        });
        res.status(200).json({ message: 'Category deleted successfully.' });
    }
    catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Server error deleting category.' });
    }
};
exports.deleteCategory = deleteCategory;
