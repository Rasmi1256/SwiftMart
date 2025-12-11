/*'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-16 text-center">
      <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
        Welcome to SwiftMart
      </h1>
      <p className="text-xl text-gray-700 max-w-xl mb-10">
        Experience AI-Powered Quick Commerce — fast, reliable, and tailored just for you.
      </p>
      <div className="space-x-4">
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="inline-block px-6 py-3 border border-indigo-600 text-indigo-600 font-semibold rounded-md hover:bg-indigo-50 transition"
        >
          Register
        </Link>
      </div>
      <section className="mt-16 max-w-4xl text-left">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Choose SwiftMart?</h2>
        <ul className="list-disc list-inside space-y-3 text-gray-700 text-lg">
          <li>Lightning-fast delivery powered by AI optimization</li>
          <li>Wide selection of products at your fingertips</li>
          <li>Seamless and secure checkout experience</li>
          <li>Personalized recommendations tailored to your needs</li>
          <li>24/7 customer support to assist you anytime</li>
        </ul>
      </section>
    </main>
  );
}*/
// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { RecommendedProduct } from '@/types';
import { getAuthToken } from '@/lib/auth'; // To check if user is logged in for personalized recs

export default function HomePage() {
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getAuthToken();
        let fetchedRecommendations: RecommendedProduct[] = [];

        if (token) {
          // If logged in, attempt to get personalized recommendations
          // For MVP, we'll use a placeholder user_id. In future, extract from JWT.
          const userId = "some_placeholder_user_id"; // Replace with actual user ID from JWT
          fetchedRecommendations = await api<RecommendedProduct[]>('/recommendations/personalized', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, num_recommendations: 8 }),
          });
        } else {
          // If not logged in, get general popular recommendations
          fetchedRecommendations = await api<RecommendedProduct[]>('/recommendations/popular?num_recommendations=8');
        }
        setRecommendations(fetchedRecommendations);
      } catch (err: any) {
        setError(err.message || 'Failed to load recommendations.');
        console.error('Recommendations fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error loading recommendations</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link href="/products" className="text-indigo-600 hover:underline">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
        <h1 className="text-4xl font-bold text-center text-indigo-700 mb-8">
          Welcome to SwiftMart!
        </h1>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
            {getAuthToken() ? 'Personalized Recommendations' : 'Popular Products'}
          </h2>
          {recommendations.length === 0 ? (
            <p className="text-center text-gray-600 text-lg">No recommendations available right now. Check back later!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {recommendations.map((product) => (
                <div key={product._id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
                  {/* Link to product details page in the regular products app */}
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
                      <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                    </Link>
                    <p className="text-xl font-bold text-indigo-600 mt-auto">
                      ${product.price.current.toFixed(2)} / {product.unit}
                    </p>
                    {/* Add to Cart button (future implementation) */}
                    <button
                      className="mt-3 w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="text-center">
          <Link href="/products" className="inline-block px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition duration-300">
            Explore All Products
          </Link>
        </section>
      </div>
    </div>
  );
}
