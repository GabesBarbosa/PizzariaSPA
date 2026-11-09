import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PaymentMethodDto {
  key: string;
  label: string;
}

export interface DeliveryZoneDto {
  minKm: number;
  maxKm: number;
  fee: number;
}

export interface PublicBusinessDto {
  id: string;
  name: string;
  slug: string;
  paymentMethods: PaymentMethodDto[];
  hasOrigin: boolean;
  deliveryZones: DeliveryZoneDto[];
  originCity: string | null;
  /** null = horário não cadastrado (não bloqueia pedidos). */
  openingHours: Record<string, { aberto: boolean; abre?: string; fecha?: string }> | null;
  openNow: boolean | null;
  /** Ex.: "hoje às 18:00", "amanhã às 11:00". */
  nextOpening: string | null;
}

export interface PublicVariationDto {
  id: string;
  name: string;
  type: 'size' | 'addon' | 'removal' | 'custom' | string;
  priceModifier: number;
}

export interface PublicProductDto {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageBase64?: string | null;
  /** null = produto sem controle de estoque; 0 = esgotado. */
  stockQuantity?: number | null;
  /** false = esgotado; o cardápio mostra o item, mas bloqueia o pedido. */
  available?: boolean;
  totalSold?: number;
  variations?: PublicVariationDto[];
}

export interface PublicMenuDto {
  categories: Record<string, PublicProductDto[]>;
}

export interface CepDto {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  uf: string;
}

export interface ShippingQuoteDto {
  distanceKm: number;
  fee: number;
  outOfRange: boolean;
}

export interface PublicCustomerDto {
  id: string;
  name: string;
  phone: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  uf?: string;
}

export interface PublicOrderItem {
  productId: string;
  quantity: number;
  variations?: { variationId: string }[];
}

export function getVariationTypeLabel(type: string): string {
  const labels: Record<string, string> = { size: 'Tamanho', addon: 'Adicional', removal: 'Remoção', custom: 'Personalizado' };
  return labels[type] || type;
}

export interface CreatePublicOrderDto {
  customerId: string;
  items: PublicOrderItem[];
  paymentMethod?: string;
  changeFor?: number;
  deliveryAddress?: string;
  deliveryFee?: number;
  notes?: string;
  tableNumber?: number;
}

export interface CreatedOrderDto {
  id: number;
  total: number;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class PublicShopService {
  private readonly base = environment.apiUrl.replace(/\/$/, '') + '/public';

  constructor(private http: HttpClient) {}

  getBusiness(slug: string): Observable<PublicBusinessDto> {
    return this.http.get<PublicBusinessDto>(`${this.base}/${slug}/business`);
  }

  getMenu(slug: string): Observable<PublicMenuDto> {
    return this.http.get<PublicMenuDto>(`${this.base}/${slug}/menu`);
  }

  lookupCep(cep: string): Observable<CepDto> {
    const clean = cep.replace(/\D/g, '');
    return this.http.get<CepDto>(`${this.base}/cep/${clean}`);
  }

  quoteShipping(slug: string, payload: { cep: string; number?: string; street?: string; neighborhood?: string; city?: string; uf?: string }): Observable<ShippingQuoteDto> {
    return this.http.post<ShippingQuoteDto>(`${this.base}/${slug}/shipping`, payload);
  }

  upsertCustomer(slug: string, payload: {
    name?: string;
    phone?: string;
    tableNumber?: number;
    cep?: string; street?: string; number?: string; complement?: string;
    neighborhood?: string; city?: string; uf?: string;
  }): Observable<PublicCustomerDto> {
    return this.http.post<PublicCustomerDto>(`${this.base}/${slug}/customers`, payload);
  }

  getCustomerByToken(slug: string, token: string): Observable<PublicCustomerDto> {
    return this.http.get<PublicCustomerDto>(`${this.base}/${slug}/customers?token=${encodeURIComponent(token)}`);
  }

  lookupCustomerByPhone(slug: string, phone: string): Observable<PublicCustomerDto> {
    const digits = phone.replace(/\D/g, '');
    return this.http.get<PublicCustomerDto>(`${this.base}/${slug}/customers/lookup?phone=${digits}`);
  }

  getTopProducts(slug: string): Observable<PublicProductDto[]> {
    return this.http.get<PublicProductDto[]>(`${this.base}/${slug}/top-products`);
  }

  createOrder(slug: string, payload: CreatePublicOrderDto): Observable<CreatedOrderDto> {
    return this.http.post<CreatedOrderDto>(`${this.base}/${slug}/orders`, payload);
  }
}
