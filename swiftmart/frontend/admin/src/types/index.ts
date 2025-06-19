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
export type OrderStatus = 'pending' | 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

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