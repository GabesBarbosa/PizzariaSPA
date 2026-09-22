export type VariationType = 'size' | 'addon' | 'removal' | 'custom';

export interface ProductVariation {
  id: string;
  productId: string;
  name: string;
  type: VariationType;
  priceModifier: number;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  imageBase64?: string | null;
  /** null = produto sem controle de estoque (sempre disponível); 0 = esgotado. */
  stockQuantity?: number | null;
  active?: boolean;
  createdAt?: string;
  variations?: ProductVariation[];
}
