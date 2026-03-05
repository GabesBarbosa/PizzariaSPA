export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  category: 'pizza' | 'bebida' | 'outro';
  imageUrl?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
