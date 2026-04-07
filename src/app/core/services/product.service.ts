import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product, ProductVariation } from '../../shared/models';
import { environment } from '../../../environments/environment';

export interface CreateVariationDto {
  name: string;
  type: string;
  priceModifier: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly baseUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.baseUrl);
  }

  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  create(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, product);
  }

  update(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${id}`, product);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getVariations(productId: string): Observable<ProductVariation[]> {
    return this.http.get<ProductVariation[]>(`${this.baseUrl}/${productId}/variations`);
  }

  createVariation(productId: string, data: CreateVariationDto): Observable<ProductVariation> {
    return this.http.post<ProductVariation>(`${this.baseUrl}/${productId}/variations`, data);
  }

  updateVariation(productId: string, variationId: string, data: Partial<CreateVariationDto>): Observable<ProductVariation> {
    return this.http.put<ProductVariation>(`${this.baseUrl}/${productId}/variations/${variationId}`, data);
  }

  deleteVariation(productId: string, variationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${productId}/variations/${variationId}`);
  }
}
