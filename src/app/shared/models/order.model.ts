import { Customer } from './customer.model';
import { Product } from './product.model';

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

export type PaymentMethod = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix';

export interface OrderItemVariation {
  variationId: string;
  name?: string;
  priceModifier: number;
}

export interface OrderItem {
  id?: string;
  productId: string;
  product?: Product;
  productName?: string;
  quantity: number;
  unitPrice?: number;
  finalPrice?: number;
  price?: number;
  variations?: OrderItemVariation[];
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
  items: { productId: string; quantity: number; variations?: { variationId: string }[] }[];
  paymentMethod?: string;
  deliveryAddress?: string;
  notes?: string;
  deliveryFee?: number;
}
