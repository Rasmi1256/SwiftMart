import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Category, CategoriesResponse } from '@/types';

interface CategoryEntry {
  id: string;
  name: string;
  description: string;
  parentId?: string;
}

interface CategoryCreatorProps {
  onClose?: () => void;
}

const CategoryCreator = ({ onClose }: CategoryCreatorProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<CategoryEntry[]>([
    { id: '1', name: '', description: '' }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response: CategoriesResponse = await api('/categories');
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const addEntry = () => {
    const newId = Date.now().toString();
    setEntries([...entries, { id: newId, name: '', description: '' }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const updateEntry = (id: string, field: keyof CategoryEntry, value: string) => {
    setEntries(entries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validEntries = entries.filter(entry => entry.name.trim());

    if (validEntries.length === 0) {
      alert('Please add at least one category name');
      setLoading(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const entry of validEntries) {
      try {
        await api('/categories', {
          method: 'POST',
          body: JSON.stringify({
            name: entry.name.trim(),
            description: entry.description.trim() || 'Added via quick tool',
            parentCategory: entry.parentId || null
          }),
        });
        successCount++;
      } catch (error) {
        console.error(`Error creating category "${entry.name}":`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      await fetchCategories(); // Refresh categories list
      setEntries([{ id: Date.now().toString(), name: '', description: '' }]); // Reset form
      alert(`${successCount} category(ies) created successfully! ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
    } else {
      alert('Failed to create any categories. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="p-8 bg-white rounded-xl shadow-md max-w-4xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Add Categories & Subcategories</h2>
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
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 mb-2">How to Add Categories & Subcategories:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Root Categories:</strong> Leave "Parent Category" as "Root Category"</li>
          <li>• <strong>Subcategories:</strong> Select an existing category as the parent</li>
          <li>• <strong>Multiple Items:</strong> Click "Add Another Category" to create more</li>
        </ul>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        {entries.map((entry, index) => (
          <div key={entry.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-800">Category {index + 1}</h3>
              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Category Name (e.g. Electronics)"
                  value={entry.name}
                  onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category (Optional)
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  value={entry.parentId || ''}
                  onChange={(e) => updateEntry(entry.id, 'parentId', e.target.value)}
                >
                  <option value="">Root Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Brief description (optional)"
                  value={entry.description}
                  onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={addEntry}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            + Add Another Category
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating Categories...' : `Create ${entries.filter(e => e.name.trim()).length} Categories`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryCreator;
