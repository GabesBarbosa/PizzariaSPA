import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ChatbotMode = 'ai' | 'triggers';

export interface Settings {
  deliveryFee: number;
  chatbotMode: ChatbotMode;
  chatbotEnabled: boolean;
}

export interface BusinessOrigin {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  uf: string;
  latitude: number;
  longitude: number;
}

export interface DeliveryZone {
  minKm: number;
  maxKm: number;
  fee: number;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly baseUrl = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) {}

  getSettings(): Observable<Settings> {
    return this.http.get<Settings>(this.baseUrl);
  }

  updateDeliveryFee(deliveryFee: number): Observable<{ deliveryFee: number }> {
    return this.http.put<{ deliveryFee: number }>(`${this.baseUrl}/delivery-fee`, { deliveryFee });
  }

  updateChatbotMode(mode: ChatbotMode): Observable<{ chatbotMode: ChatbotMode }> {
    return this.http.put<{ chatbotMode: ChatbotMode }>(`${this.baseUrl}/chatbot-mode`, { mode });
  }

  updateChatbotEnabled(enabled: boolean): Observable<{ chatbotEnabled: boolean }> {
    return this.http.put<{ chatbotEnabled: boolean }>(`${this.baseUrl}/chatbot-enabled`, { enabled });
  }

  getOrigin(): Observable<{ origin: BusinessOrigin | null }> {
    return this.http.get<{ origin: BusinessOrigin | null }>(`${this.baseUrl}/business-origin`);
  }

  saveOrigin(payload: Partial<BusinessOrigin>): Observable<{ origin: BusinessOrigin }> {
    return this.http.put<{ origin: BusinessOrigin }>(`${this.baseUrl}/business-origin`, payload);
  }

  getZones(): Observable<{ zones: DeliveryZone[] }> {
    return this.http.get<{ zones: DeliveryZone[] }>(`${this.baseUrl}/delivery-zones`);
  }

  saveZones(zones: DeliveryZone[]): Observable<{ zones: DeliveryZone[] }> {
    return this.http.put<{ zones: DeliveryZone[] }>(`${this.baseUrl}/delivery-zones`, { zones });
  }
}
