import { Injectable, NgZone, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

export interface NewOrderEvent {
  id: number;
  customerName: string;
  total: number;
  itemCount: number;
  channel?: string;
}

export interface WhatsappStatusEvent {
  connected: boolean;
  qrCode: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private eventSource: EventSource | null = null;
  private audio: HTMLAudioElement | null = null;
  private reconnectDelay = 1000;
  private connecting = false;

  readonly newOrder$ = new Subject<NewOrderEvent>();
  readonly whatsappStatus$ = new Subject<WhatsappStatusEvent>();

  constructor(
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  connect(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.eventSource || this.connecting) return;
    this.connecting = true;

    const token = localStorage.getItem('token') || '';
    const url = `${environment.apiUrl}/notifications/stream?token=${encodeURIComponent(token)}`;

    try {
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.info('[SSE] connected to', url);
        this.connecting = false;
        this.reconnectDelay = 1000;
      };

      this.eventSource.addEventListener('new-order', (event: any) => {
        this.zone.run(() => {
          const data: NewOrderEvent = JSON.parse(event.data);
          this.newOrder$.next(data);
          if (data.channel === 'whatsapp') {
            this.showAlert(data);
            this.playSound();
          }
        });
      });

      this.eventSource.addEventListener('whatsapp-status', (event: any) => {
        this.zone.run(() => {
          this.whatsappStatus$.next(JSON.parse(event.data));
        });
      });

      this.eventSource.onerror = (err: any) => {
        console.warn('[SSE] error or closed, will reconnect', err);
        this.disconnect();
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(30000, this.reconnectDelay * 2);
      };
    } catch (e) {
      console.error('[SSE] failed to create EventSource', e);
      this.connecting = false;
    }
  }

  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private showAlert(order: NewOrderEvent): void {
    const brl = order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    Swal.fire({
      title: '🍕 Novo Pedido via WhatsApp!',
      html: `
        <div style="text-align:left; font-size:15px; line-height:1.8">
          <b>Pedido #${order.id}</b><br>
          👤 ${order.customerName}<br>
          📦 ${order.itemCount} ${order.itemCount === 1 ? 'item' : 'itens'}<br>
          💰 ${brl}
        </div>`,
      icon: 'info',
      confirmButtonText: 'OK',
      confirmButtonColor: '#e53935',
      timer: 15000,
      timerProgressBar: true,
      toast: false,
      position: 'center',
    });
  }

  private playSound(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (!this.audio) {
        this.audio = new Audio();
        this.audio.src = 'assets/notification.wav';
      }
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
    } catch {
      /* audio blocked by browser policy */
    }
  }
}
