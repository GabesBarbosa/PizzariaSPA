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
    const id = this.route.snapshot.paramMap.get('id')!;
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
}
