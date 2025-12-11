// src/app/inventory/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import AdminAuthGuard from '@/components/AdminAuthGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Product, InventoryItem, InventoryBatchResponse, ApiResponse, InventoryUpdatePayload } from '@/types';



export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all', 'inStock', 'outOfStock', 'lowStock'
  const [showModal, setShowModal] = useState(false);
  const [currentProductForEdit, setCurrentProductForEdit] = useState<Product | null>(null);
  const [currentInventoryItem, setCurrentInventoryItem] = useState<InventoryItem | null>(null);
  const [quantityInput, setQuantityInput] = useState('');
  const [minStockInput, setMinStockInput] = useState('');
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const fetchProductsAndInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all products from Product Catalog Service
      const productsResponse = await api<{ products: Product[]; totalPages: number }>('/products?limit=1000'); // Fetch enough products
      setAllProducts(productsResponse.products);
      const productIds = productsResponse.products.map(p => p._id);

      // Fetch inventory for these products
      const inventoryResponse: InventoryBatchResponse = await api('/inventory/batch', {
        method: 'POST',
        body: JSON.stringify({ productIds }),
      });

      // Combine product details with inventory data
      const combinedInventory: InventoryItem[] = productsResponse.products.map(product => {
        const matchingInventory = inventoryResponse.stock.find(item => item.productId === product._id);
        return {
          productId: product._id,
          quantity: matchingInventory?.quantity || 0,
          locationId: matchingInventory?.locationId || 'default_dark_store',
          lastStockUpdate: matchingInventory?.lastStockUpdate || new Date().toISOString(),
          minStockLevel: matchingInventory?.minStockLevel || 10, // Default if not found
          isAvailable: (matchingInventory?.quantity || 0) > 0,
          isLowStock: (matchingInventory?.quantity || 0) <= (matchingInventory?.minStockLevel || 10),
          productName: product.name,
          productImageUrl: product.imageUrl,
          productSKU: product.SKU,
        };
      });

      setInventory(combinedInventory);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory data.');
      console.error('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndInventory();
  }, []);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = searchTerm ?
      item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productSKU?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productId.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    const matchesStatus = selectedStatus === 'all'
      ? true
      : selectedStatus === 'inStock'
        ? item.quantity > 0
        : selectedStatus === 'outOfStock'
          ? item.quantity === 0
          : selectedStatus === 'lowStock'
            ? item.isLowStock && item.quantity > 0
            : true;

    return matchesSearch && matchesStatus;
  });

  const openEditModal = (product: Product, invItem: InventoryItem) => {
    setCurrentProductForEdit(product);
    setCurrentInventoryItem(invItem);
    setQuantityInput(String(invItem.quantity));
    setMinStockInput(String(invItem.minStockLevel || 0));
    setModalMessage(null);
    setShowModal(true);
  };

  const handleUpdateInventory = async () => {
    if (!currentProductForEdit || !currentInventoryItem) return;

    const newQuantity = parseInt(quantityInput);
    const newMinStock = parseInt(minStockInput);

    if (isNaN(newQuantity) || newQuantity < 0 || isNaN(newMinStock) || newMinStock < 0) {
      setModalMessage('Quantity and Min Stock must be non-negative numbers.');
      return;
    }

    try {
      setUpdateLoading(true); // Assuming you have this state
      const payload: InventoryUpdatePayload = {
        productId: currentProductForEdit._id,
        setQuantity: newQuantity,
        minStockLevel: newMinStock,
        locationId: currentInventoryItem.locationId, // Keep locationId consistent
      };

      await api('/inventory/update', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setModalMessage('Inventory updated successfully!');
      // Re-fetch data to reflect changes accurately
      await fetchProductsAndInventory();
      setTimeout(() => setShowModal(false), 1500); // Close modal after success message
    } catch (err: any) {
      setModalMessage(`Failed to update inventory: ${err.message}`);
      console.error('Inventory update error:', err);
    } finally {
      setUpdateLoading(false);
    }
  };

  // State for loading on update inside modal (assuming it's defined elsewhere or add it)
  const [updateLoading, setUpdateLoading] = useState(false);


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
    <AdminAuthGuard>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Manage Inventory</h1>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by Product Name, SKU, ID..."
              className="flex-grow px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Stock</option>
              <option value="inStock">In Stock</option>
              <option value="outOfStock">Out of Stock</option>
              <option value="lowStock">Low Stock</option>
            </select>
          </div>

          {filteredInventory.length === 0 ? (
            <p className="text-center text-gray-600 text-lg py-10">No inventory items found matching your criteria.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInventory.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 relative rounded-full overflow-hidden">
                            <Image
                              src={item.productImageUrl || `https://placehold.co/40x40/E0F7FA/000000?text=${encodeURIComponent(item.productName || 'Product')}`}
                              alt={item.productName || 'Product Image'}
                              fill
                              style={{ objectFit: 'cover' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://placehold.co/40x40/E0F7FA/000000?text=${encodeURIComponent(item.productName || 'Product')}`;
                              }}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 line-clamp-1">{item.productName || 'Unknown Product'}</div>
                            <div className="text-sm text-gray-500">{item.productId.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.productSKU || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.minStockLevel}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.quantity === 0 ? 'bg-red-100 text-red-800' :
                          item.isLowStock ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.quantity === 0 ? 'Out of Stock' : (item.isLowStock ? 'Low Stock' : 'In Stock')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(item.lastStockUpdate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            const productData = allProducts.find(p => p._id === item.productId);
                            if (productData) {
                              openEditModal(productData, item);
                            } else {
                              setError('Product data not found for editing.');
                              setTimeout(() => setError(null), 3000);
                            }
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Inventory Modal */}
        {showModal && currentProductForEdit && currentInventoryItem && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Edit Stock: {currentProductForEdit.name}</h2>
              {modalMessage && (
                <div className={`p-3 mb-4 rounded-md text-center ${modalMessage.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {modalMessage}
                </div>
              )}
              <div className="mb-4">
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Current Quantity</label>
                <input
                  type="number"
                  id="quantity"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  min="0"
                />
              </div>
              <div className="mb-6">
                <label htmlFor="minStock" className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock Level</label>
                <input
                  type="number"
                  id="minStock"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={minStockInput}
                  onChange={(e) => setMinStockInput(e.target.value)}
                  min="0"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateInventory}
                  disabled={updateLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminAuthGuard>
  );
}