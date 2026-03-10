import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Order, OrderStatus } from '../../../../shared/models';
import { OrderService } from '../../../../core/services/order.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';
import { ORDER_STATUS_LABELS, ORDER_STATUS_FLOW } from '../../../../shared/utils/order-status.util';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatListModule, MatChipsModule, MatDividerModule,
    MatSnackBarModule, MatTooltipModule,
    LoadingComponent, BrlPipe
  ],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss'
})
export class OrderDetailComponent implements OnInit {
  order?: Order;
  loading = true;
  notFound = false;
  customerOrderCount = 0;
  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly statusFlow = ORDER_STATUS_FLOW;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.orderService.getById(id).subscribe({
      next: (order) => {
        this.order = order;
        this.loading = false;
        // Load customer order count for loyalty stamps (all orders count)
        this.orderService.getByCustomer(order.customerId).subscribe({
          next: (orders) => {
            this.customerOrderCount = orders.length;
          }
        });
      },
      error: () => {
        this.notFound = true;
        this.loading = false;
      }
    });
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as OrderStatus] || status;
  }

  getPaymentLabel(method: string): string {
    const labels: Record<string, string> = {
      dinheiro: 'Dinheiro',
      cartao_credito: 'Cartão de Crédito',
      cartao_debito: 'Cartão de Débito',
      pix: 'PIX'
    };
    return labels[method] || method;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      RECEIVED: '#1976d2',
      PREPARING: '#f57c00',
      OUT_FOR_DELIVERY: '#7b1fa2',
      DELIVERED: '#388e3c'
    };
    return colors[status] || '#757575';
  }

  getNextStatus(): OrderStatus | null {
    if (!this.order) return null;
    const idx = this.statusFlow.indexOf(this.order.status);
    if (idx < 0 || idx >= this.statusFlow.length - 1) return null;
    return this.statusFlow[idx + 1];
  }

  getPrevStatus(): OrderStatus | null {
    if (!this.order) return null;
    const idx = this.statusFlow.indexOf(this.order.status);
    if (idx <= 0) return null;
    return this.statusFlow[idx - 1];
  }

  getNextStatusIcon(status: OrderStatus): string {
    const icons: Record<string, string> = {
      PREPARING: 'restaurant',
      OUT_FOR_DELIVERY: 'delivery_dining',
      DELIVERED: 'check_circle'
    };
    return icons[status] || 'arrow_forward';
  }

  advanceStatus(): void {
    const next = this.getNextStatus();
    if (!this.order || !next) return;
    this.orderService.updateStatus(this.order.id, next).subscribe({
      next: (updated) => {
        this.order!.status = updated.status;
        this.snackBar.open(`Status: ${this.getStatusLabel(updated.status)}`, 'OK', { duration: 2500 });
      },
      error: () => this.snackBar.open('Erro ao atualizar status', 'OK', { duration: 3000 })
    });
  }

  revertStatus(): void {
    const prev = this.getPrevStatus();
    if (!this.order || !prev) return;
    this.orderService.updateStatus(this.order.id, prev).subscribe({
      next: (updated) => {
        this.order!.status = updated.status;
        this.snackBar.open(`Revertido para: ${this.getStatusLabel(updated.status)}`, 'OK', { duration: 2500 });
      },
      error: () => this.snackBar.open('Erro ao reverter status', 'OK', { duration: 3000 })
    });
  }

  printOrder(): void {
    if (!this.order) return;

    const items = this.order.items.map(i => {
      const name = i.productName || i.product?.name || 'Produto';
      const price = i.price ?? 0;
      return `<tr><td>${i.quantity}x ${name}</td><td style="text-align:right">${this.formatBrl(price)}</td><td style="text-align:right">${this.formatBrl(i.quantity * price)}</td></tr>`;
    }).join('');

    const deliveryFeeRow = this.order.deliveryFee
      ? `<tr><td colspan="2"><strong>Taxa de Entrega</strong></td><td style="text-align:right">${this.formatBrl(this.order.deliveryFee)}</td></tr>`
      : '';

    const paymentLine = this.order.paymentMethod
      ? `<p><strong>Pagamento:</strong> ${this.getPaymentLabel(this.order.paymentMethod)}</p>`
      : '';

    const addressLine = this.order.deliveryAddress
      ? `<p><strong>Endereço:</strong> ${this.order.deliveryAddress}</p>`
      : '';

    const notesLine = this.order.notes
      ? `<p><strong>Obs:</strong> ${this.order.notes}</p>`
      : '';

    const stampsCount = this.customerOrderCount % 10;
    const isFull = stampsCount === 0 && this.customerOrderCount > 0;
    const filled = isFull ? 10 : stampsCount;

    let stampsHtml = '';
    for (let i = 0; i < 10; i++) {
      const active = i < filled;
      stampsHtml += `<span class="stamp ${active ? 'active' : ''}">${active ? '🍕' : '⚪'}</span>`;
    }

    const loyaltyMessage = isFull
      ? '<p class="loyalty-prize">🎉 PARABÉNS! GANHOU 1 PIZZA GRÁTIS! 🎉</p>'
      : `<p class="loyalty-count">${filled}/10 pedidos — Faltam ${10 - filled}!</p>`;

    const loyaltySection = `
      <hr>
      <div class="loyalty-card">
        <p class="loyalty-title">🏆 Cartão Fidelidade</p>
        <div class="stamps">${stampsHtml}</div>
        ${loyaltyMessage}
      </div>
    `;

    const html = `
      <html><head><title>Pedido #${this.order.id}</title>
      <style>
        body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; }
        h2 { text-align: center; margin: 0 0 4px 0; font-size: 16px; }
        .subtitle { text-align: center; font-size: 11px; margin-bottom: 12px; color: #666; }
        hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; }
        .total { font-size: 14px; font-weight: bold; text-align: right; margin-top: 4px; }
        p { margin: 4px 0; }
        .loyalty-card { text-align: center; padding: 8px 0; }
        .loyalty-title { font-weight: bold; font-size: 13px; margin-bottom: 6px; }
        .stamps { display: flex; justify-content: center; gap: 4px; flex-wrap: wrap; margin: 6px 0; }
        .stamp { font-size: 18px; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px dashed #ccc; }
        .stamp.active { border-color: #e65100; background: #fff3e0; }
        .loyalty-count { font-size: 11px; color: #555; margin-top: 4px; }
        .loyalty-prize { font-size: 13px; font-weight: bold; color: #e65100; margin-top: 4px; animation: pulse 1s infinite; }
        @keyframes pulse { 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.05); } }
      </style></head><body>
      <h2>🍕 Pizzatec</h2>
      <p class="subtitle">${new Date(this.order.createdAt!).toLocaleString('pt-BR')}</p>
      <hr>
      <p><strong>Cliente:</strong> ${this.order.customerName || 'N/A'}</p>
      ${addressLine}
      ${paymentLine}
      ${notesLine}
      <hr>
      <table>
        <tr><th style="text-align:left">Item</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr>
        ${items}
        ${deliveryFeeRow}
      </table>
      <hr>
      <p class="total">TOTAL: ${this.formatBrl(this.order.total)}</p>
      ${loyaltySection}
      <hr>
      <p style="text-align:center;font-size:11px">Obrigado pela preferência!</p>
      </body></html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  private formatBrl(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
