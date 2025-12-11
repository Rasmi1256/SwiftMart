// src/types/index.ts

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  createdAt?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

// Order Management Service Types
export type OrderStatus = 'pending' | 'placed' | 'processing' | 'assigned' | 'picked_up' | 'shipped' | 'delivered' | 'cancelled';

export interface AdminOrder {
  id: string;
  userId: string; // The ID of the user who placed the order
  status: OrderStatus;
  totalAmount: number;
  shippingAddressId?: string; // The ID of the address (from user-service)
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  items?: AdminOrderItem[];
}

export interface AdminOrderItem {
  id: string; // OrderItem ID
  orderId: string;
  productId: string; // Product Catalog Service's Product _id
  productName: string;
  productImageUrl?: string;
  unitPrice: number;
  quantity: number;
  createdAt: string;
}

export interface OrdersResponse {
  message: string;
  orders: AdminOrder[];
}

export interface SingleOrderResponse {
  message: string;
  order: AdminOrder;
}

export interface ApiResponse<T> {
  message: string;
  data?: T;
  error?: string;
}
export interface InventoryItem {
  productId: string;
  quantity: number;
  locationId: string;
  lastStockUpdate: string;
  minStockLevel?: number;
  isAvailable: boolean; // Derived status
  isLowStock: boolean; // Derived status
  productName?: string; // Will be populated for display
  productImageUrl?: string; // Will be populated for display
  productSKU?: string; // Will be populated for display
}

export interface InventoryBatchResponse {
  message: string;
  stock: InventoryItem[];
}

export interface InventoryUpdatePayload {
  productId: string;
  quantityChange?: number; // Either change by this amount
  setQuantity?: number;    // Or set to this absolute amount
  locationId?: string;
  minStockLevel?: number;
}
// ...other type exports

export type Product = {
  _id: string;
  name: string;
  imageUrl?: string;
  SKU?: string;
}

export interface OrderType {
  _id: string;
  orderId: string;
  items: AdminOrderItem[];
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddressId?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  couponCode?: string;
  discountAmount?: number;
  finalTotal?: number;
}

export interface DriverType {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  vehicleType: 'bike' | 'scooter' | 'car' | 'bicycle';
  licensePlate?: string;
  status: 'active' | 'inactive' | 'on-duty' | 'off-duty';
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  assignedOrders: string[];
}
