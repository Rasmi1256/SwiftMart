// src/app/products/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Product } from '@/types';
import Image from 'next/image';
import Link from 'next/link';

export default function ProductDetailPage() {
  const { id } = useParams(); // Get ID from URL
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        setLoading(true);
        setError(null);
        try {
          const data: Product = await api(`/products/${id}`);
          setProduct(data);
        } catch (err: any) {
          setError(err.message || 'Failed to fetch product details.');
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link href="/products" className="text-indigo-600 hover:underline">Back to Products</Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Product Not Found</h2>
          <p className="text-gray-700 mb-6">The product you are looking for does not exist.</p>
          <Link href="/products" className="text-indigo-600 hover:underline">Back to Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
        <Link href="/products" className="text-indigo-600 hover:underline mb-4 block">
          &larr; Back to Products
        </Link>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative w-full h-80 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
            <Image
              src={product.imageUrl || `https://placehold.co/600x400/E0F7FA/000000?text=${encodeURIComponent(product.name)}`}
              alt={product.name}
              fill
              style={{ objectFit: 'contain' }} // Use contain for product images
              className="rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://placehold.co/600x400/E0F7FA/000000?text=${encodeURIComponent(product.name)}`;
              }}
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{product.name}</h1>
            <p className="text-xl font-bold text-indigo-600 mb-4">
              ${product.price.toFixed(2)} / {product.unit}
            </p>
            <p className="text-gray-700 mb-4">{product.description}</p>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <strong className="font-semibold">Category:</strong>{' '}
                <Link href={`/products?category=${product.category._id}`} className="text-indigo-600 hover:underline">
                  {product.category.name}
                </Link>
                {product.subCategory && (
                  <>
                    {' '} / {' '}
                    <Link href={`/products?category=${product.subCategory._id}`} className="text-indigo-600 hover:underline">
                      {product.subCategory.name}
                    </Link>
                  </>
                )}
              </p>
              {product.brand && (
                <p className="text-sm text-gray-600">
                  <strong className="font-semibold">Brand:</strong> {product.brand}
                </p>
              )}
              <p className="text-sm text-gray-600">
                <strong className="font-semibold">SKU:</strong> {product.SKU}
              </p>
              <p className="text-sm text-gray-600">
                <strong className="font-semibold">Availability:</strong>{' '}
                <span className={product.isAvailable ? 'text-green-600' : 'text-red-600'}>
                  {product.isAvailable
                      ? product.isLowStock && product.stockQuantity > 0 ? `Low Stock! (${product.stockQuantity} available)` : `In Stock (${product.stockQuantity} available)`
                      : 'Out of Stock'}
                </span>
              </p>
            </div>

            {product.nutritionalInfo && Object.keys(product.nutritionalInfo).length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Nutritional Information</h3>
                <ul className="list-disc list-inside text-gray-700">
                  {Object.entries(product.nutritionalInfo).map(([key, value]) => (
                    <li key={key}><strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> {value}</li>
                  ))}
                </ul>
              </div>
            )}

            {product.tags && product.tags.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <span key={index} className="bg-gray-200 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Cart button (will be implemented in a later phase) */}
            <button className="w-full py-3 px-6 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}