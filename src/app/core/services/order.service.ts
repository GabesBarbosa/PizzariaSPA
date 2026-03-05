import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order, CreateOrderDto, OrderStatus } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly baseUrl = '/api/orders';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Order[]> {
    return this.http.get<Order[]>(this.baseUrl);
  }

  getById(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/${id}`);
  }

  create(order: CreateOrderDto): Observable<Order> {
    return this.http.post<Order>(this.baseUrl, order);
  }

  updateStatus(id: number, status: OrderStatus): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/${id}/status`, { status });
  }
}
