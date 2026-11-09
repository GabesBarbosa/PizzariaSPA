import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardStats } from '../../shared/models';
import { environment } from '../../../environments/environment';

export type DashboardPeriod = 'day' | 'week' | 'month';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getStats(period: DashboardPeriod = 'week'): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/stats`, { params: { period } });
  }

  getAnalytics(period: DashboardPeriod = 'week'): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/analytics`, { params: { period } });
  }

  getCustomerAnalytics(period: DashboardPeriod = 'week'): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/customer-analytics`, { params: { period } });
  }

  /** RF22/RF25: CSV com um pedido por linha. Vem como blob para o interceptor continuar mandando o token. */
  exportOrdersCsv(from: string, to: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/orders`, { params: { from, to }, responseType: 'blob' });
  }

  getExportSummary(from: string, to: string): Observable<ExportSummary> {
    return this.http.get<ExportSummary>(`${this.baseUrl}/export/summary`, { params: { from, to } });
  }
}

export interface ExportSummary {
  from: string;
  to: string;
  orders: number;
  revenue: number;
  avgTicket: number;
  deliveryFees: number;
  cancelledOrders: number;
  cancelledTotal: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  payments: { method: string; orders: number; revenue: number }[];
}
