import { OrderStatus } from '../models';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: 'Recebido',
  PREPARING: 'Preparando',
  OUT_FOR_DELIVERY: 'Saiu para Entrega',
  DELIVERED: 'Entregue'
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'RECEIVED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
];
