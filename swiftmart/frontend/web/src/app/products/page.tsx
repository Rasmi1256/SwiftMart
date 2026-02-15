// src/app/products/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../../lib/api'; // Use relative path
import { Search, Filter, ChevronDown, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Product, ProductsResponse } from '@/types';
import Link from 'next/link';

// Mock Categories (In a real app, this would be fetched from the Catalog Service)
const CATEGORIES = ['All', 'Dairy', 'Produce', 'Snacks', 'Beverages', 'Frozen Goods', 'Home Essentials'];

// Sort Options
const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest (Default)' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A to Z' },
];

export default function ProductSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({ totalResults: 0, totalPages: 0, page: 1 });

  // State derived from URL search params
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'All';
  const initialSort = searchParams.get('sort') || 'latest';
  const initialMinPrice = searchParams.get('minPrice') || '';
  const initialMaxPrice = searchParams.get('maxPrice') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [sortValue, setSortValue] = useState(initialSort);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  
  const currentPage = parseInt(searchParams.get('page') || '1');

  // Main data fetching function
  const fetchProducts = useCallback(async (params: URLSearchParams) => {
    setLoading(true);
    setResults([]);
    const sortValue = params.get('sort') || 'latest_desc';
    const [sortBy, sortOrder] = sortValue.split('_');

    params.delete('sort'); // The API uses sortBy/sortOrder, so we remove the combined 'sort' value.
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);

    const apiUrl = `/api/products?${params.toString()}`;
    try {
      const response: ProductSearchResponse = await api(apiUrl);

      setResults(response.products || []);
      setPagination({
        totalResults: response.totalProducts,
        totalPages: response.totalPages,
        page: response.currentPage
      });
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to fetch data whenever the URL search params change
  useEffect(() => {
    fetchProducts(searchParams);
  }, [searchParams, fetchProducts]);

  // This effect synchronizes the local state with the URL's search parameters.
  // This is crucial for handling browser back/forward navigation correctly.
  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    setActiveCategory(searchParams.get('category') || 'All');
    setSortValue(searchParams.get('sort') || 'latest');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
  }, [searchParams]);

  // Helper to update the URL. All state changes that should affect the URL go through here.
  const updateUrl = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || (key === 'page' && value === 1) || (key === 'category' && value === 'All') || (key === 'sort' && value === 'latest')) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    // Reset to page 1 if any filter/sort/query changes
    if (Object.keys(updates).some(k => k !== 'page')) {
      params.delete('page');
    }

    router.push(`/products?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Handle Search Input Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ q: searchQuery });
  };
  
  // Handle Filter Application (Price and Category)
  const handleApplyFilters = () => {
    updateUrl({ minPrice, maxPrice });
  };
  
  // Handle Page Change
  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage });
  };

  // Handlers for immediate updates (category and sort)
  const handleCategoryChange = (category: string) => {
    updateUrl({ category });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUrl({ sort: e.target.value });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-6">Product Search 🔎</h1>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="mb-8">
        <div className="flex items-center bg-white border border-gray-300 rounded-xl shadow-lg overflow-hidden">
          <input
            type="text"
            placeholder="Search for groceries, snacks, or home goods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 p-4 text-lg focus:outline-none"
          />
          <button
            type="submit"
            className="p-4 bg-indigo-600 text-white hover:bg-indigo-700 transition duration-300"
            aria-label="Search"
          >
            <Search size={24} />
          </button>
        </div>
      </form>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filter Sidebar */}
        <aside className="w-full lg:w-64 p-6 bg-white rounded-xl shadow-lg flex-shrink-0 sticky top-24 h-fit">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
            <Filter size={20} className="mr-2 text-indigo-500" /> Filters
          </h3>

          {/* Category Filter */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-700 mb-2">Category</h4>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`w-full text-left py-2 px-3 rounded-lg transition duration-150 text-sm ${
                  activeCategory === cat ? 'bg-indigo-500 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Price Range Filter */}
          <div className="mb-6 border-t pt-4">
            <h4 className="font-semibold text-gray-700 mb-2">Price Range (USD)</h4>
            <div className="flex space-x-2 mb-3">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-1/2 p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-1/2 p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          
          <button
            onClick={handleApplyFilters}
            className="w-full py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            Apply Filters
          </button>

        </aside>

        {/* Search Results Area */}
        <main className="flex-1">
          {/* Results Header and Sorting */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              {pagination.totalResults} Results Found
            </h2>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="sort" className="text-gray-700 text-sm">Sort by:</label>
              <select
                id="sort"
                value={sortValue}
                onChange={handleSortChange}
                className="py-2 px-3 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-indigo-500 focus:border-indigo-500 transition"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin text-indigo-600" size={48} />
              <p className="ml-3 text-lg text-gray-600">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {results.map((product) => (
                  <Link href={`/product/${product.productId}`} key={product.productId} className="block group">
                    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition duration-300 overflow-hidden border border-gray-100">
                      <div className="relative w-full h-40">
                        <Image
                          fill
                          src={product.imageUrl || 'https://placehold.co/400x300/e0e7ff/6366f1?text=Image+Missing'}
                          alt={product.name}
                          className="object-cover group-hover:scale-105 transition duration-500"
                        />
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-semibold text-indigo-600 uppercase">{product.category}</p>
                        <h3 className="text-lg font-bold text-gray-800 mt-1 truncate">{product.name}</h3>
                        <p className="text-xl font-extrabold text-gray-900 mt-2">${product.price.toFixed(2)}</p>
                        <p className="text-xs text-green-600 mt-1">{product.availableStock} in stock</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-center items-center space-x-4 mt-10">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200"
                >
                  Previous
                </button>
                <span className="font-semibold text-gray-700">
                  Page {currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center bg-white rounded-xl shadow-lg mt-12">
              <Search size={48} className="text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No Products Found</h2>
              <p className="text-gray-600">Try refining your search or clearing the filters.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
