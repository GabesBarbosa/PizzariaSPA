import { OrderStatus } from '../models';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  recebido: 'Recebido',
  preparando: 'Preparando',
  saiu_para_entrega: 'Saiu para Entrega',
  entregue: 'Entregue'
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'recebido',
  'preparando',
  'saiu_para_entrega',
  'entregue'
];
