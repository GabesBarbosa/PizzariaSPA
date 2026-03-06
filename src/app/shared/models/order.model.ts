import { Customer } from './customer.model';
import { Product } from './product.model';

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

export interface OrderItem {
  id?: string;
  productId: string;
  product?: Product;
  productName?: string;
  quantity: number;
  price?: number;
  unitPrice?: number;
  subtotal?: number;
}

export interface Order {
  id: string;
  customerId: string;
  customer?: Customer;
  customerName?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  notes?: string;
  createdAt?: string;
}

export interface CreateOrderDto {
  customerId: string;
  items: { productId: string; quantity: number }[];
  notes?: string;
}
