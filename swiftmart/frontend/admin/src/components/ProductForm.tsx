'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  DollarSign,
  Tag,
  Image as ImageIcon,
  FileText,
  Layers,
  AlertCircle,
  Hash,
  Box,
  CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';
import { ProductCreateData, Category, CategoriesResponse } from '@/types';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const [formData, setFormData] = useState<ProductCreateData>({
    name: '',
    description: '',
    priceCurrent: 0,
    priceUnit: 'USD',
    unit: 'piece',
    categoryId: '',
    subCategoryId: '',
    brand: '',
    SKU: '',
    imageUrl: '',
    thumbnailUrl: '',
    stockQuantity: 0,
    minStockLevel: 0,
    tags: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchSubCategories(selectedCategoryId);
    } else {
      setSubCategories([]);
    }
  }, [selectedCategoryId]);

const fetchCategories = async () => {
  try {
    // 1. Remove '?isRoot=true' to see if ANY data exists in the DB
    const response: CategoriesResponse = await api('/categories');
    console.log("Debug - Total Categories Found:", response.categories.length); 
    
    if (response && response.categories) {
      setCategories(response.categories);
    }
  } catch (error) {
    console.error('API Error:', error);
  }
};
  const fetchSubCategories = async (parentId: string) => {
    try {
      const response: CategoriesResponse = await api(`/categories?parentId=${parentId}`);
      setSubCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
      setSubCategories([]);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priceCurrent: 0,
      priceUnit: 'USD',
      unit: 'piece',
      categoryId: '',
      subCategoryId: '',
      brand: '',
      SKU: '',
      imageUrl: '',
      thumbnailUrl: '',
      stockQuantity: 0,
      minStockLevel: 0,
      tags: [],
    });
    setSelectedCategoryId('');
    setImagePreview('');
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.priceCurrent <= 0) newErrors.priceCurrent = 'Price must be greater than 0';
    if (!formData.categoryId) newErrors.categoryId = 'Category is required';
    if (!formData.SKU.trim()) newErrors.SKU = 'SKU is required';
    if (!formData.imageUrl.trim()) newErrors.imageUrl = 'Image URL is required';
    if (formData.stockQuantity < 0) newErrors.stockQuantity = 'Stock quantity cannot be negative';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await api('/products', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      onSuccess();
    } catch (error) {
      console.error('Failed to create product:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create product' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductCreateData, value: any) => {
    if (field === 'categoryId') {
      setSelectedCategoryId(value);
      setFormData(prev => ({ ...prev, categoryId: value, subCategoryId: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUrlChange = (value: string) => {
    setFormData(prev => ({ ...prev, imageUrl: value }));
    setImagePreview(value);
    if (errors.imageUrl) {
      setErrors(prev => ({ ...prev, imageUrl: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop with Blur */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10 shrink-0">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Box className="w-6 h-6 text-indigo-600" />
                Add New Product
              </h3>
              <p className="text-sm text-gray-500 mt-1">Fill in the details to create a new inventory item.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto bg-gray-50/50">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
              
              {/* --- Section 1: General Information --- */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b pb-2">
                  <FileText className="w-4 h-4" /> General Information
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                          errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="e.g. Premium Leather Wallet"
                      />
                    </div>
                    {errors.name && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.name}</p>}
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Hash className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={formData.SKU}
                        onChange={(e) => handleInputChange('SKU', e.target.value)}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                          errors.SKU ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="STOCK-KEEPING-UNIT"
                      />
                    </div>
                    {errors.SKU && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.SKU}</p>}
                  </div>

                   {/* Brand */}
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand</label>
                    <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Tag className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => handleInputChange('brand', e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-300 transition-all"
                        placeholder="e.g. Nike, Apple"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className={`block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none ${
                        errors.description ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="Describe the product features and specifications..."
                    />
                    {errors.description && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.description}</p>}
                  </div>
                </div>
              </div>

              {/* --- Section 2: Pricing & Inventory --- */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b pb-2">
                  <DollarSign className="w-4 h-4" /> Pricing & Inventory
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Base Price <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 font-semibold">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.priceCurrent}
                        onChange={(e) => handleInputChange('priceCurrent', parseFloat(e.target.value) || 0)}
                        className={`block w-full pl-8 pr-12 py-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                          errors.priceCurrent ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder="0.00"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 text-sm">USD</span>
                      </div>
                    </div>
                    {errors.priceCurrent && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.priceCurrent}</p>}
                  </div>

                  {/* Stock */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock Quantity</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Layers className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.stockQuantity}
                        onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                        className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                          errors.stockQuantity ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      />
                    </div>
                    {errors.stockQuantity && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.stockQuantity}</p>}
                  </div>

                  {/* Min Stock */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Min Stock Level</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minStockLevel}
                      onChange={(e) => handleInputChange('minStockLevel', parseInt(e.target.value) || 0)}
                      className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-300 transition-all"
                    />
                  </div>

                  {/* Unit Type */}
                  <div className="md:col-span-3">
                     <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit Type</label>
                     <div className="flex gap-4">
                        <select
                          value={formData.unit}
                          onChange={(e) => handleInputChange('unit', e.target.value)}
                          className="block w-full md:w-1/3 px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                        >
                          <option value="piece">Piece</option>
                          <option value="kg">Kilogram</option>
                          <option value="liter">Liter</option>
                          <option value="meter">Meter</option>
                          <option value="pack">Pack</option>
                        </select>
                     </div>
                  </div>
                </div>
              </div>

              {/* --- Section 3: Organization --- */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b pb-2">
                  <Tag className="w-4 h-4" /> Categorization
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category <span className="text-red-500">*</span></label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => handleInputChange('categoryId', e.target.value)}
                      className={`block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white ${
                        errors.categoryId ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                    {errors.categoryId && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.categoryId}</p>}
                  </div>

                  {/* Subcategory */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Subcategory</label>
                    <select
                      value={formData.subCategoryId}
                      onChange={(e) => handleInputChange('subCategoryId', e.target.value)}
                      className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                      disabled={!selectedCategoryId}
                    >
                      <option value="">{selectedCategoryId ? 'Select a subcategory' : 'Select category first'}</option>
                      {subCategories.map((subCategory) => (
                        <option key={subCategory.id} value={subCategory.id}>{subCategory.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* --- Section 4: Media --- */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b pb-2">
                  <ImageIcon className="w-4 h-4" /> Media
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Image URL <span className="text-red-500">*</span></label>
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="flex-1 w-full">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="url"
                          value={formData.imageUrl}
                          onChange={(e) => handleImageUrlChange(e.target.value)}
                          className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
                            errors.imageUrl ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          placeholder="https://example.com/product-image.jpg"
                        />
                      </div>
                      {errors.imageUrl ? (
                        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.imageUrl}</p>
                      ) : (
                        <p className="mt-1.5 text-xs text-gray-500">Paste a direct link to the product image (JPG, PNG, WebP).</p>
                      )}
                    </div>
                    
                    {/* Image Preview Box */}
                    <div className="shrink-0">
                      <div className={`w-32 h-32 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 transition-all ${
                        imagePreview ? 'border-indigo-200 shadow-md' : 'border-gray-300'
                      }`}>
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={() => setImagePreview('')}
                          />
                        ) : (
                          <div className="text-center p-2">
                             <ImageIcon className="h-8 w-8 text-gray-300 mx-auto mb-1" />
                             <span className="text-xs text-gray-400">No Image</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Global Error Banner */}
              {errors.submit && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-200 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">{errors.submit}</div>
                </div>
              )}

            </form>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all shadow-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 border border-transparent text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Create Product</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProductForm;