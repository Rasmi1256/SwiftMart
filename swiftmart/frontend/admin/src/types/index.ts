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

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriesResponse {
  message: string;
  categories: Category[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCurrent: number;
  priceUnit: string;
  unit: string;
  categoryId: string;
  subCategoryId?: string;
  brand?: string;
  SKU: string;
  imageUrl: string;
  thumbnailUrl?: string;
  stockQuantity: number;
  minStockLevel: number;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreateData {
  name: string;
  description: string;
  priceCurrent: number;
  priceUnit: string;
  unit: string;
  categoryId: string;
  subCategoryId?: string;
  brand?: string;
  SKU: string;
  imageUrl: string;
  thumbnailUrl?: string;
  stockQuantity: number;
  minStockLevel: number;
  tags?: string[];
}

export interface ProductCreateResponse {
  message: string;
  product: Product;
}
