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
      const unitPrice = i.finalPrice ?? i.unitPrice ?? i.price ?? 0;
      const variations = (i.variations || []).map(v => v.variationName || v.name || '').filter(Boolean).join(', ');
      const variationsLine = variations ? `<br><small style="color:#555">(${variations})</small>` : '';
      return `<tr>
        <td>${i.quantity}x ${name}${variationsLine}</td>
        <td style="text-align:right">${this.formatBrl(unitPrice)}</td>
        <td style="text-align:right">${this.formatBrl(i.quantity * unitPrice)}</td>
      </tr>`;
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
      </style></head><body>
      <h2>Comanda</h2>
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

  getVariationNames(item: any): string {
    return (item.variations || []).map((v: any) => v.variationName || v.name).filter(Boolean).join(', ');
  }

  private formatBrl(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
