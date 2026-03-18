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
}
