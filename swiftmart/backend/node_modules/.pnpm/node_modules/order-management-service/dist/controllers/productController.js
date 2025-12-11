"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.getProductByIdentifier = exports.getProducts = exports.createProduct = void 0;
const db_1 = __importDefault(require("../db"));
const config_1 = require("../config");
const redis_1 = require("redis");
const axios_1 = __importDefault(require("axios"));
const redisClient = (0, redis_1.createClient)({ url: config_1.config.redisUrl });
redisClient.connect().catch(console.error);
const fetchDynamicPrices = async (productIds) => {
    var _a;
    if (productIds.length === 0) {
        return new Map();
    }
    try {
        const response = await axios_1.default.post(`${config_1.config.pricingServiceUrl}/dynamic`, {
            product_ids: productIds,
        });
        const dynamicPricesMap = new Map();
        response.data.forEach((item) => {
            dynamicPricesMap.set(item.productId, item.dynamicPrice);
        });
        return dynamicPricesMap;
    }
    catch (error) {
        console.error('Error fetching dynamic prices:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        return new Map(); // Return empty map on error
    }
};
const fetchStockStatus = async (productIds) => {
    var _a;
    if (productIds.length === 0) {
        return new Map();
    }
    try {
        const response = await axios_1.default.post(`${config_1.config.inventoryServiceUrl}/inventory/batch`, {
            productIds: productIds,
        });
        const stockMap = new Map();
        response.data.forEach((item) => {
            stockMap.set(item.productId, { quantity: item.quantity, isAvailable: item.isAvailable, isLowStock: item.isLowStock });
        });
        return stockMap;
    }
    catch (error) {
        console.error('Error fetching stock status:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        return new Map(); // Return empty map on error
    }
};
// @desc    Create a new product
// @route   POST /api/products
// @access  Admin (would add auth middleware here)
const createProduct = async (req, res) => {
    const { name, description, priceCurrent, priceUnit, categoryId, subCategoryId, brand, SKU, imageUrl, thumbnailUrl, nutritionalInfo, weightValue, weightUnit, dimensionLength, dimensionWidth, dimensionHeight, dimensionUnit, tags, isAvailable } = req.body;
    if (!name || !description || !priceCurrent || !priceUnit || !categoryId || !SKU || !imageUrl) {
        res.status(400).json({ message: 'Please fill all required product fields.' });
        return;
    }
    // Validate category and subCategory ID format before querying
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(categoryId)) {
        res.status(400).json({ message: 'Invalid category ID format.' });
        return;
    }
    if (subCategoryId && !uuidRegex.test(subCategoryId)) {
        res.status(400).json({ message: 'Invalid sub-category ID format.' });
        return;
    }
    try {
        // Validate category existence
        const existingCategory = await db_1.default.category.findUnique({
            where: { id: categoryId }
        });
        if (!existingCategory) {
            res.status(400).json({ message: 'Invalid category ID provided.' });
            return;
        }
        if (subCategoryId) {
            const existingSubCategory = await db_1.default.category.findUnique({
                where: { id: subCategoryId }
            });
            if (!existingSubCategory || existingSubCategory.parentCategoryId !== categoryId) {
                res.status(400).json({ message: 'Invalid sub-category ID or not a child of the main category.' });
                return;
            }
        }
        const productExists = await db_1.default.product.findUnique({
            where: { SKU }
        });
        if (productExists) {
            res.status(400).json({ message: 'Product with this SKU already exists.' });
            return;
        }
        const createdProduct = await db_1.default.product.create({
            data: {
                name,
                description,
                priceCurrent,
                priceUnit,
                unit: priceUnit, // Assuming unit is priceUnit
                categoryId,
                subCategoryId,
                brand,
                SKU,
                imageUrl,
                thumbnailUrl,
                nutritionalInfo,
                weightValue,
                weightUnit,
                dimensionLength,
                dimensionWidth,
                dimensionHeight,
                dimensionUnit,
                tags,
                isAvailable
            }
        });
        res.status(201).json({
            message: 'Product created successfully',
            product: createdProduct,
        });
    }
    catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Server error creating product.' });
    }
};
exports.createProduct = createProduct;
// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    const { search, category, minPrice, maxPrice, brand, sortBy, order, limit = 10, page = 1 } = req.query;
    const cacheKey = `products:${JSON.stringify({ search, category, minPrice, maxPrice, brand, sortBy, order, limit, page })}`;
    try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json(JSON.parse(cachedData));
        }
    }
    catch (error) {
        console.error('Redis get error:', error);
    }
    const where = {};
    const options = {
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        orderBy: {}
    };
    if (search) {
        // Note: Prisma doesn't have built-in full-text search like MongoDB, this might need adjustment
        where.name = { contains: search, mode: 'insensitive' };
    }
    if (category) {
        try {
            const categoryDoc = await db_1.default.category.findFirst({
                where: {
                    OR: [
                        { id: category },
                        { slug: category }
                    ]
                }
            });
            if (categoryDoc) {
                where.categoryId = categoryDoc.id;
            }
            else {
                return res.status(404).json({ message: 'Category not found for filtering.' });
            }
        }
        catch (error) {
            return res.status(400).json({ message: 'Invalid category ID or slug.' });
        }
    }
    if (minPrice || maxPrice) {
        where.priceCurrent = {};
        if (minPrice)
            where.priceCurrent.gte = parseFloat(minPrice);
        if (maxPrice)
            where.priceCurrent.lte = parseFloat(maxPrice);
    }
    if (brand) {
        where.brand = brand;
    }
    if (sortBy) {
        options.orderBy[sortBy] = order === 'desc' ? 'desc' : 'asc';
    }
    else {
        options.orderBy.createdAt = 'desc';
    }
    try {
        const [products, totalProducts] = await Promise.all([
            db_1.default.product.findMany({
                where,
                include: {
                    category: {
                        select: {
                            name: true,
                            slug: true
                        }
                    },
                    subCategory: {
                        select: {
                            name: true,
                            slug: true
                        }
                    }
                },
                ...options
            }),
            db_1.default.product.count({ where })
        ]);
        const productIds = products.map(p => p.id);
        // Fetch dynamic prices and stock status concurrently
        const [dynamicPricesMap, stockStatusMap] = await Promise.all([
            fetchDynamicPrices(productIds),
            fetchStockStatus(productIds)
        ]);
        const productsWithDynamicPriceAndStock = products.map(p => {
            const dynamicPrice = dynamicPricesMap.get(p.id);
            const stockStatus = stockStatusMap.get(p.id);
            // Apply dynamic price if available
            const priceCurrent = dynamicPrice !== null && dynamicPrice !== undefined ? dynamicPrice : p.priceCurrent;
            return {
                ...p,
                priceCurrent,
                isAvailable: (stockStatus === null || stockStatus === void 0 ? void 0 : stockStatus.isAvailable) || false,
                stockQuantity: (stockStatus === null || stockStatus === void 0 ? void 0 : stockStatus.quantity) || 0,
                isLowStock: (stockStatus === null || stockStatus === void 0 ? void 0 : stockStatus.isLowStock) || true
            };
        });
        const responseData = {
            products: productsWithDynamicPriceAndStock,
            totalProducts,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / options.take),
        };
        try {
            await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));
        }
        catch (error) {
            console.error('Redis set error:', error);
        }
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error('Error fetching products with dynamic prices and stock:', error);
        res.status(500).json({ message: 'Server error fetching products.' });
    }
};
exports.getProducts = getProducts;
// @desc    Get a single product by ID or SKU
// @route   GET /api/products/:identifier
// @access  Public
const getProductByIdentifier = async (req, res) => {
    const { identifier } = req.params;
    const cacheKey = `product:${identifier}`;
    try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json(JSON.parse(cachedData));
        }
    }
    catch (error) {
        console.error('Redis get error:', error);
    }
    try {
        let product = await db_1.default.product.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { SKU: identifier }
                ]
            },
            include: {
                category: {
                    select: {
                        name: true,
                        slug: true
                    }
                },
                subCategory: {
                    select: {
                        name: true,
                        slug: true
                    }
                }
            }
        });
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        // Fetch dynamic price and stock status concurrently
        const [dynamicPricesMap, stockStatusMap] = await Promise.all([
            fetchDynamicPrices([product.id]),
            fetchStockStatus([product.id])
        ]);
        const dynamicPrice = dynamicPricesMap.get(product.id);
        const stockStatus = stockStatusMap.get(product.id);
        // Apply dynamic price if available
        const priceCurrent = dynamicPrice !== null && dynamicPrice !== undefined ? dynamicPrice : product.priceCurrent;
        const productObj = {
            ...product,
            priceCurrent,
            isAvailable: (stockStatus === null || stockStatus === void 0 ? void 0 : stockStatus.isAvailable) || false,
            stockQuantity: (stockStatus === null || stockStatus === void 0 ? void 0 : stockStatus.quantity) || 0,
            isLowStock: (stockStatus === null || stockStatus === void 0 ? void 0 : stockStatus.isLowStock) || true
        };
        try {
            await redisClient.setEx(cacheKey, 300, JSON.stringify(productObj));
        }
        catch (error) {
            console.error('Redis set error:', error);
        }
        res.status(200).json(productObj);
    }
    catch (error) {
        console.error('Error fetching single product with dynamic price and stock:', error);
        res.status(500).json({ message: 'Server error fetching product.' });
    }
};
exports.getProductByIdentifier = getProductByIdentifier;
// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Admin
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, description, priceCurrent, priceUnit, categoryId, subCategoryId, brand, SKU, imageUrl, thumbnailUrl, nutritionalInfo, weightValue, weightUnit, dimensionLength, dimensionWidth, dimensionHeight, dimensionUnit, tags, isAvailable } = req.body;
    try {
        const existingProduct = await db_1.default.product.findUnique({
            where: { id }
        });
        if (!existingProduct) {
            res.status(404).json({ message: 'Product not found.' });
            return;
        }
        // Validate category existence if provided
        if (categoryId) {
            const existingCategory = await db_1.default.category.findUnique({
                where: { id: categoryId }
            });
            if (!existingCategory) {
                res.status(400).json({ message: 'Invalid category ID provided.' });
                return;
            }
        }
        if (subCategoryId) {
            const existingSubCategory = await db_1.default.category.findUnique({
                where: { id: subCategoryId }
            });
            if (!existingSubCategory || (categoryId && existingSubCategory.parentCategoryId !== categoryId)) {
                res.status(400).json({ message: 'Invalid sub-category ID or not a child of the main category.' });
                return;
            }
        }
        // Check for duplicate SKU if SKU is being updated
        if (SKU && SKU !== existingProduct.SKU) {
            const skuExists = await db_1.default.product.findUnique({
                where: { SKU }
            });
            if (skuExists) {
                res.status(400).json({ message: 'Another product with this SKU already exists.' });
                return;
            }
        }
        // Update product fields
        const updatedProduct = await db_1.default.product.update({
            where: { id },
            data: {
                name: name !== undefined ? name : existingProduct.name,
                description: description !== undefined ? description : existingProduct.description,
                priceCurrent: priceCurrent !== undefined ? priceCurrent : existingProduct.priceCurrent,
                priceUnit: priceUnit !== undefined ? priceUnit : existingProduct.priceUnit,
                unit: priceUnit !== undefined ? priceUnit : existingProduct.unit,
                categoryId: categoryId !== undefined ? categoryId : existingProduct.categoryId,
                subCategoryId: subCategoryId !== undefined ? subCategoryId : existingProduct.subCategoryId,
                brand: brand !== undefined ? brand : existingProduct.brand,
                SKU: SKU !== undefined ? SKU : existingProduct.SKU,
                imageUrl: imageUrl !== undefined ? imageUrl : existingProduct.imageUrl,
                thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : existingProduct.thumbnailUrl,
                nutritionalInfo: nutritionalInfo !== undefined ? nutritionalInfo : existingProduct.nutritionalInfo,
                weightValue: weightValue !== undefined ? weightValue : existingProduct.weightValue,
                weightUnit: weightUnit !== undefined ? weightUnit : existingProduct.weightUnit,
                dimensionLength: dimensionLength !== undefined ? dimensionLength : existingProduct.dimensionLength,
                dimensionWidth: dimensionWidth !== undefined ? dimensionWidth : existingProduct.dimensionWidth,
                dimensionHeight: dimensionHeight !== undefined ? dimensionHeight : existingProduct.dimensionHeight,
                dimensionUnit: dimensionUnit !== undefined ? dimensionUnit : existingProduct.dimensionUnit,
                tags: tags !== undefined ? tags : existingProduct.tags,
                isAvailable: isAvailable !== undefined ? isAvailable : existingProduct.isAvailable
            }
        });
        res.status(200).json({
            message: 'Product updated successfully',
            product: updatedProduct,
        });
    }
    catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Server error updating product.' });
    }
};
exports.updateProduct = updateProduct;
// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Admin
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const existingProduct = await db_1.default.product.findUnique({
            where: { id }
        });
        if (!existingProduct) {
            res.status(404).json({ message: 'Product not found.' });
            return;
        }
        await db_1.default.product.delete({
            where: { id }
        });
        res.status(200).json({ message: 'Product deleted successfully.' });
    }
    catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Server error deleting product.' });
    }
};
exports.deleteProduct = deleteProduct;
