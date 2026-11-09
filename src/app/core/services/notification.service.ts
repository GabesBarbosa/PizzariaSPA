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

export interface HandoffEvent {
  phone: string;
  name: string | null;
  startedAt: number;
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
  /** Cliente pediu atendimento humano no WhatsApp (RF30). */
  readonly handoff$ = new Subject<HandoffEvent>();
  /** Atendimento humano encerrado (o bot voltou a responder). */
  readonly handoffEnded$ = new Subject<{ phone: string }>();

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
          this.showAlert(data);
          this.playSound();
        });
      });

      this.eventSource.addEventListener('whatsapp-status', (event: any) => {
        this.zone.run(() => {
          this.whatsappStatus$.next(JSON.parse(event.data));
        });
      });

      this.eventSource.addEventListener('handoff', (event: any) => {
        this.zone.run(() => {
          const data: HandoffEvent = JSON.parse(event.data);
          this.handoff$.next(data);
          this.showHandoffAlert(data);
          this.playSound();
        });
      });

      this.eventSource.addEventListener('handoff-ended', (event: any) => {
        this.zone.run(() => this.handoffEnded$.next(JSON.parse(event.data)));
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
    const title = order.channel === 'whatsapp' ? '🍴 Novo Pedido via WhatsApp!' : '🛒 Novo Pedido via Cardápio!';
    Swal.fire({
      title,
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

  private showHandoffAlert(h: HandoffEvent): void {
    const quem = h.name ? `${h.name} (${formatPhone(h.phone)})` : formatPhone(h.phone);
    Swal.fire({
      title: '🙋 Pedido de atendimento humano',
      html: `
        <div style="text-align:left; font-size:15px; line-height:1.7">
          Cliente <b>${escapeHtml(quem)}</b> pediu para falar com um atendente.<br>
          O chatbot parou de responder essa conversa. Responda pelo WhatsApp do estabelecimento.<br>
          <small>Quando terminar, clique em <b>Encerrar atendimento</b> na página WhatsApp.</small>
        </div>`,
      icon: 'warning',
      confirmButtonText: 'OK',
      confirmButtonColor: '#25d366',
      timer: 30000,
      timerProgressBar: true,
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

/** 11987654321 → (11) 98765-4321 */
export function formatPhone(phone: string): string {
  const d = (phone || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
