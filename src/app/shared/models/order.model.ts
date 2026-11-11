import { Customer } from './customer.model';
import { Product } from './product.model';

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export type DeliveryType = 'delivery' | 'pickup';

export type PaymentMethod = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix';

export interface OrderItemVariation {
  variationId: string;
  /** Nome da variação no momento do pedido (a API retorna como `variationName`, join com ProductVariations). */
  variationName?: string;
  variationType?: string;
  /** @deprecated a API não envia esse campo pra itens de pedido; use `variationName`. Mantido por compatibilidade. */
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
  deliveryType?: DeliveryType;
  deliveryAddress?: string;
  notes?: string;
  deliveryFee?: number;
  tableNumber?: number;
  channel?: string;
  createdAt?: string;
}

export interface CreateOrderDto {
  customerId: string;
  items: { productId: string; quantity: number; variations?: { variationId: string }[] }[];
  paymentMethod?: string;
  deliveryType?: DeliveryType;
  deliveryAddress?: string;
  notes?: string;
  deliveryFee?: number;
}
