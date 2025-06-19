// src/app/products/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Product, ProductsResponse, Category } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react'; // Import icon

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const productsPerPage = 10; // Matches backend default limit
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data: Category[] = await api('/categories');
        setCategories(data);
      } catch (err: any) {
        console.error('Failed to fetch categories:', err);
        setError('Failed to load categories.');
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.append('search', searchQuery);
        if (selectedCategory) queryParams.append('category', selectedCategory);
        queryParams.append('limit', String(productsPerPage));
        queryParams.append('page', String(currentPage));

        const data: ProductsResponse = await api(`/products?${queryParams.toString()}`);
        setProducts(data.products);
        setTotalPages(data.totalPages);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch products.');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [searchQuery, selectedCategory, currentPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(1); // Reset to first page on new category filter
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleAddToCart = async (productId: string, productName: string) => {
    console.log(`Adding product to cart: productId=${productId}, productName=${productName}`); // Added logging
    setCartMessage(null);
    const token = localStorage.getItem('token');
    try {
      await api('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : `Bearer ${token}`,
         
        },
      });
      setCartMessage(`${productName} added to cart!`);
      // Optionally, you might want to refetch cart data here or update a global cart state
    } catch (err: any) {
      setCartMessage(`Failed to add ${productName} to cart: ${err.message || JSON.stringify(err)}`); // Improved error message
      console.error('Add to cart error:', err);
    } finally {
      setTimeout(() => setCartMessage(null), 3000); // Clear message after 3 seconds
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">SwiftMart Products</h1>

        {cartMessage && (
          <div className={`p-3 mb-4 rounded-md text-center ${cartMessage.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {cartMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search products..."
            className="flex-grow px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <select
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedCategory}
            onChange={handleCategoryChange}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {products.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">No products found matching your criteria.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product._id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden h-full flex flex-col">
                  <Link href={`/products/${product._id}`} className="block">
                    <div className="relative w-full h-48 bg-gray-200 flex items-center justify-center">
                      <Image
                        src={product.imageUrl || `https://placehold.co/400x300/E0F7FA/000000?text=${encodeURIComponent(product.name)}`}
                        alt={product.name}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="rounded-t-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/400x300/E0F7FA/000000?text=${encodeURIComponent(product.name)}`;
                        }}
                      />
                    </div>
                  </Link>
                  <div className="p-4 flex-grow flex flex-col">
                    <Link href={`/products/${product._id}`} className="block">
                      <h2 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2">{product.name}</h2>
                      <p className="text-sm text-gray-600 mb-2">{product.category.name}</p>
                    </Link>
                    <p className="text-xl font-bold text-indigo-600 mt-auto">
                      ${product.price.toFixed(2)} / {product.unit}
                    </p>
                    <button
                      onClick={() => handleAddToCart(product._id, product.name)}
                      disabled={!product.isAvailable}
                      className={`mt-3 w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        product.isAvailable ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-gray-400 cursor-not-allowed'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                    >
                      <ShoppingCart size={18} className="mr-2" />
                      {product.isAvailable ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-8">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 rounded-md ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}