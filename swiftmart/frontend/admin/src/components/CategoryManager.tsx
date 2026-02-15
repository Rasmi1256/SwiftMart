import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Category, CategoriesResponse } from '@/types';
import { Trash2, AlertTriangle, Package, Layers } from 'lucide-react';

interface CategoryWithCount extends Category {
  _count?: {
    products: number;
    children: number;
  };
}

interface CategoryManagerProps {
  onClose?: () => void;
}

const CategoryManager = ({ onClose }: CategoryManagerProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response: CategoriesResponse = await api('/categories');
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(categoryId);
    try {
      await api(`/categories/${categoryId}`, {
        method: 'DELETE',
      });

      // Remove from local state
      setCategories(categories.filter(cat => cat.id !== categoryId));
      alert(`Category "${categoryName}" deleted successfully!`);
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert(`Failed to delete category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryHierarchy = (parentId?: string): Category[] => {
    return categories.filter(cat => cat.parentId === parentId);
  };

  const renderCategoryTree = (parentId?: string, level = 0): React.ReactElement[] => {
    const cats = getCategoryHierarchy(parentId);

    return cats.map(category => (
      <React.Fragment key={category.id}>
        <tr className={`${level > 0 ? 'bg-gray-50' : 'bg-white'} border-b border-gray-200`}>
          <td className="px-6 py-4">
            <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
              {level > 0 && <span className="text-gray-400 mr-2">↳</span>}
              <div>
                <div className="font-medium text-gray-900">{category.name}</div>
                {category.description && (
                  <div className="text-sm text-gray-500">{category.description}</div>
                )}
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Package className="w-4 h-4 mr-1" />
                {category._count?.products || 0} products
              </div>
              <div className="flex items-center">
                <Layers className="w-4 h-4 mr-1" />
                {category._count?.children || 0} subcategories
              </div>
            </div>
          </td>
          <td className="px-6 py-4 text-right">
            <button
              onClick={() => handleDelete(category.id, category.name)}
              disabled={deletingId === category.id}
              className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed p-1"
              title="Delete category"
            >
              {deletingId === category.id ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </td>
        </tr>
        {renderCategoryTree(category.id, level + 1)}
      </React.Fragment>
    ));
  };

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-xl shadow-md max-w-6xl mx-auto mt-10">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading categories...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white rounded-xl shadow-md max-w-6xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Manage Categories</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Close"
          >
            ✕
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories Found</h3>
          <p className="text-gray-500">Categories will appear here once you add them.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
              <div className="text-sm text-yellow-800">
                <strong>Warning:</strong> Deleting a category will permanently remove it and cannot be undone.
                Categories with products or subcategories cannot be deleted.
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {renderCategoryTree()}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryManager;
