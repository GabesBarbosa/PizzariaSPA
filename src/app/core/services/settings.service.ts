import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ChatbotMode = 'ai' | 'triggers';

export interface Settings {
  deliveryFee: number;
  chatbotMode: ChatbotMode;
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
}
