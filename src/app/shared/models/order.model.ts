import { Customer } from './customer.model';
import { Product } from './product.model';

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

export type PaymentMethod = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix';

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
  id: number;
  customerId: string;
  customer?: Customer;
  customerName?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  deliveryAddress?: string;
  notes?: string;
  deliveryFee?: number;
  createdAt?: string;
}

export interface CreateOrderDto {
  customerId: string;
  items: { productId: string; quantity: number }[];
  paymentMethod?: string;
  deliveryAddress?: string;
  notes?: string;
  deliveryFee?: number;
}
