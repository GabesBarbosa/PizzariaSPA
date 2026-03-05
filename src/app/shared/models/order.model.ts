import { Customer } from './customer.model';
import { Product } from './product.model';

export type OrderStatus = 'recebido' | 'preparando' | 'saiu_para_entrega' | 'entregue';

export interface OrderItem {
  id?: number;
  productId: number;
  product?: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: number;
  customerId: number;
  customer?: Customer;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrderDto {
  customerId: number;
  items: { productId: number; quantity: number }[];
  notes?: string;
}
