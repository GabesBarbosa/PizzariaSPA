import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Settings {
  deliveryFee: number;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly baseUrl = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) {}

  getSettings(): Observable<Settings> {
    return this.http.get<Settings>(this.baseUrl);
  }

  updateDeliveryFee(deliveryFee: number): Observable<Settings> {
    return this.http.put<Settings>(`${this.baseUrl}/delivery-fee`, { deliveryFee });
  }
}
