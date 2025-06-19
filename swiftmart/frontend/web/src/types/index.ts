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
  price: number;
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
  order_id: string;
  product_id: string; // MongoDB Product ID
  product_name: string;
  product_image_url?: string;
  unit_price: number;
  quantity: number;
  created_at: string;
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