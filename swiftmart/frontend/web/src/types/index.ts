export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  createdAt?: string;
}

export interface Address {
  id: string;
  userId: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface ProfileResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  createdAt?: string;
  addresses: Address[];
}

export interface ApiResponse<T> {
  message: string;
  data?: T;
  error?: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  slug: string;
  parentCategory?: { _id: string; name: string; slug: string }; // Populated parent category
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: {
    current: number; // This will be the base price from DB. Dynamic price will override this in response.
    unit: string;
    currency?: string;
    previous?: number; // Optional: for showing strike-through price
    effectiveDate?: Date; // Optional: when this base price became effective
  };
  unit: string;
  category: Category; // Populated category
  subCategory?: Category; // Populated sub-category
  brand?: string;
  SKU: string;
  imageUrl: string;
  thumbnailUrl?: string;
  nutritionalInfo?: { [key: string]: any };
  weight?: { value: number; unit: string };
  dimensions?: { length: number; width: number; height: number; unit: string };
  tags?: string[];
  isAvailable: boolean;
  stockQuantity: number; // NEW
  isLowStock: boolean;
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  products: Product[];
  totalProducts: number;
  currentPage: number;
  totalPages: number;
}

export interface CartItem {
  id: string; // order_item ID
  orderId: string;
  productId: string; // MongoDB Product ID
  product_name: string;
  product_image_url?: string;
  unit_price: number;
  quantity: number;
  createdAt: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  shipping_address_id?: string; // User's address ID
  payment_method?: string;
  created_at: string;
  updated_at: string;
  items: CartItem[]; // Array of items in this order
}

export interface PlaceOrderPayload {
  shippingAddressId: string;
  paymentMethod: string;
}
export interface RecommendedProduct {
  _id: string;
  name: string;
  price: {
    current: number;
    unit: string;
    currency: string;
  };
  unit: string;
  imageUrl: string;
  category: string; // The category name
}
export interface ChatMessageData {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export interface ChatbotRequestPayload {
  user_message: string;
  userId?: string;
  authToken?: string;
}

export interface ChatbotResponseData {
  response: string;
  orderId?: string;
  orderStatus?: string;
}
export interface NotificationType {
  _id: string;
  userId: string;
  type: string;
  message: string;
  data?: { [key: string]: any };
  read: boolean;
  createdAt: string;
}

export interface NotificationData {
  message: string;
  notifications: NotificationType[];
}
// src/types/index.ts

// ... (existing interfaces and types)

export interface ProductIndex {
  productId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  tags: string[];
  imageUrl: string;
  availableStock: number;
  isAvailable: boolean;
  score: number;
  relevanceScore?: number;
}

export interface SearchPagination {
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ProductSearchResponse {
  message: string;
  query: {
    q: string;
    category: string;
    sortBy: string;
    total: number;
  };
  products: ProductIndex[];
  pagination: SearchPagination;
}
export interface OrderType {
  orderId: string;
  items: CartItem[];
  userId: string;
  status: 'pending' | 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface CartDetails extends OrderType {
  // NEW fields from IOrder model:
  couponCode?: string;
  discountAmount: number;
  finalTotal: number;
}
