export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'CAJERO' | 'SUPERVISOR';
  active: boolean;
  lastLogin?: string;
}

export interface Category {
  id: number;
  name: string;
  active: boolean;
  _count?: { products: number };
}

export interface Brand {
  id: number;
  name: string;
  active: boolean;
  _count?: { products: number };
}

export interface Supplier {
  id: number;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  unitOfMeasure: string;
  taxRate: number;
  taxExempt: boolean;
  imageUrl?: string;
  active: boolean;
  categoryId: number;
  brandId: number;
  supplierId?: number;
  category?: Category;
  brand?: Brand;
  supplier?: Supplier;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface Sale {
  id: number;
  folio: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: 'EFECTIVO' | 'TARJETA' | 'MIXTO';
  cashReceived?: number;
  cardAmount?: number;
  changeGiven?: number;
  status: string;
  createdAt: string;
  userId: number;
  user?: { fullName: string };
  items?: SaleItem[];
  ticket?: Ticket;
}

export interface SaleItem {
  id: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  productId: number;
  product?: Product;
}

export interface Ticket {
  id: number;
  saleId: number;
  ticketData: string;
  printed: boolean;
  printCount: number;
}

export interface TicketData {
  store: { name: string; address: string; rfc: string; phone: string };
  sale: {
    folio: string;
    date: string;
    cashier: string;
    items: { name: string; quantity: number; unitPrice: number; discount: number; subtotal: number; tax: number; total: number }[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: string;
    cashReceived: number | null;
    cardAmount: number | null;
    changeGiven: number;
  };
}

export interface DashboardData {
  today: { total: number; count: number; discount: number };
  week: { total: number; count: number };
  month: { total: number; count: number };
  profit: { revenue: number; cost: number; profit: number; margin: number };
  topProducts: { productId: number; name: string; sku: string; totalQuantity: number; totalRevenue: number }[];
  lowStockProducts: { id: number; name: string; sku: string; stock: number; min_stock: number }[];
  salesByDay: { date: string; total: number; count: number }[];
  salesByCategory: { category: string; total: number; quantity: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
