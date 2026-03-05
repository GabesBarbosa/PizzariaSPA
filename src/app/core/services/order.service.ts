import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order, CreateOrderDto, OrderStatus } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly baseUrl = '/api/orders';

  constructor(private http: HttpClient) {}

  getByCustomer(customerId: string): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/customer/${customerId}`);
  }

  create(order: CreateOrderDto): Observable<Order> {
    return this.http.post<Order>(this.baseUrl, order);
  }

  updateStatus(id: string, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`${this.baseUrl}/${id}/status`, { status });
  }
}
