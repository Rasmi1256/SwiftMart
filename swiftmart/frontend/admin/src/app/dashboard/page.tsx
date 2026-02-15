'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, DollarSign, Package, Users } from 'lucide-react';
import CategoryCreator from '@/components/CategoryCreator';
import CategoryManager from '@/components/CategoryManager';
import { api } from '@/lib/api';
import { CategoriesResponse, Category } from '@/types';

// Mock data - in a real app, this would come from an API
const stats = [
  { name: 'Total Revenue', value: '$405,091.00', icon: DollarSign, change: '+4.75%', changeType: 'positive' },
  { name: 'Total Orders', value: '15,203', icon: Package, change: '+12.2%', changeType: 'positive' },
  { name: 'New Customers', value: '1,254', icon: Users, change: '-2.1%', changeType: 'negative' },
  { name: 'Conversion Rate', value: '5.72%', icon: BarChart, change: '+1.5%', changeType: 'positive' },
];

const DashboardPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response: CategoriesResponse = await api('/categories');
        setCategories(response.categories || []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCategoryCreator(!showCategoryCreator)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <span>+</span>
            Add Categories
          </button>
          <button
            onClick={() => setShowCategoryManager(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <span>⚙️</span>
            Manage Categories
          </button>
        </div>
      </div>

      {/* Category Creator - Toggle visibility */}
      {showCategoryCreator && (
        <div className="mb-8">
          <CategoryCreator onClose={() => setShowCategoryCreator(false)} />
        </div>
      )}

      {/* Category Manager - Toggle visibility */}
      {showCategoryManager && (
        <div className="mb-8">
          <CategoryManager onClose={() => setShowCategoryManager(false)} />
        </div>
      )}

      {/* Show message if no categories exist */}
      {!loadingCategories && categories.length === 0 && !showCategoryCreator && (
        <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-yellow-800">No Categories Found</h3>
              <p className="text-yellow-700 mt-1">You need categories before you can add products. Click "Add Categories" to get started.</p>
            </div>
            <button
              onClick={() => setShowCategoryCreator(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Add Categories
            </button>
          </div>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-lg shadow-md flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              <p className={`text-xs mt-2 ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change} vs last month
              </p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <stat.icon className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        ))}
      </div>

      {/* More dashboard components can be added here */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Sales Over Time</h2>
          {/* Placeholder for a chart */}
          <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
            <p className="text-gray-500">Chart component would go here</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
          {/* Placeholder for an activity feed */}
          <ul className="space-y-4">
            <li className="text-sm text-gray-600">New order #15204 placed.</li>
            <li className="text-sm text-gray-600">Product "Organic Bananas" is low on stock.</li>
            <li className="text-sm text-gray-600">New user registered: user@example.com.</li>
            <li className="text-sm text-gray-600">Order #15201 has been fulfilled.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

