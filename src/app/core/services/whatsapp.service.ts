import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WhatsappStatus {
  connected: boolean;
  qrCode: string | null;
}

export interface SendMessageDto {
  phone: string;
  message: string;
}

export interface BulkResult {
  totalCustomers?: number;
  success: string[];
  failed: { phone: string; error: string }[];
}

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private readonly baseUrl = `${environment.apiUrl}/whatsapp`;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<WhatsappStatus> {
    return this.http.get<WhatsappStatus>(`${this.baseUrl}/status`);
  }

  send(data: SendMessageDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/send`, data);
  }

  sendBulk(phones: string[], message: string): Observable<BulkResult> {
    return this.http.post<BulkResult>(`${this.baseUrl}/send-bulk`, { phones, message });
  }

  sendToAll(message: string): Observable<BulkResult> {
    return this.http.post<BulkResult>(`${this.baseUrl}/send-all`, { message });
  }
}
