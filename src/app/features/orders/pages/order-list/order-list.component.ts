import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { Order, OrderStatus } from '../../../../shared/models';
import { OrderService } from '../../../../core/services/order.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';
import { ORDER_STATUS_LABELS, ORDER_STATUS_FLOW } from '../../../../shared/utils/order-status.util';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatCardModule, MatChipsModule, MatSnackBarModule,
    MatTooltipModule, MatDialogModule,
    LoadingComponent, BrlPipe
  ],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss'
})
export class OrderListComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  loading = true;
  displayedColumns = ['id', 'customer', 'total', 'status', 'createdAt', 'actions'];
  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly statusFlow = ORDER_STATUS_FLOW;
  private orderSub?: Subscription;

  constructor(
    private orderService: OrderService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    this.orderSub = this.notificationService.newOrder$.subscribe(() => {
      this.loadOrders();
    });
  }

  ngOnDestroy(): void {
    this.orderSub?.unsubscribe();
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as OrderStatus] || status;
  }

  getNextStatus(order: Order): OrderStatus | null {
    const currentIdx = this.statusFlow.indexOf(order.status);
    if (currentIdx < 0 || currentIdx >= this.statusFlow.length - 1) return null;
    return this.statusFlow[currentIdx + 1];
  }

  getNextStatusIcon(status: OrderStatus): string {
    const icons: Record<string, string> = {
      PREPARING: 'restaurant',
      OUT_FOR_DELIVERY: 'delivery_dining',
      DELIVERED: 'check_circle'
    };
    return icons[status] || 'arrow_forward';
  }

  getPrevStatus(order: Order): OrderStatus | null {
    const currentIdx = this.statusFlow.indexOf(order.status);
    if (currentIdx <= 0) return null;
    return this.statusFlow[currentIdx - 1];
  }

  advanceStatus(order: Order): void {
    const next = this.getNextStatus(order);
    if (!next) return;
    this.orderService.updateStatus(order.id, next).subscribe({
      next: (updated) => {
        order.status = updated.status;
        this.snackBar.open(
          `Pedido atualizado para: ${this.getStatusLabel(updated.status)}`,
          'OK', { duration: 2500 }
        );
      },
      error: () => {
        this.snackBar.open('Erro ao atualizar status', 'OK', { duration: 3000 });
      }
    });
  }

  revertStatus(order: Order): void {
    const prev = this.getPrevStatus(order);
    if (!prev) return;
    this.orderService.updateStatus(order.id, prev).subscribe({
      next: (updated) => {
        order.status = updated.status;
        this.snackBar.open(
          `Pedido revertido para: ${this.getStatusLabel(updated.status)}`,
          'OK', { duration: 2500 }
        );
      },
      error: () => {
        this.snackBar.open('Erro ao reverter status', 'OK', { duration: 3000 });
      }
    });
  }

  viewOrder(order: Order): void {
    this.router.navigate(['/pedidos', order.id]);
  }

  editOrder(order: Order): void {
    this.router.navigate(['/pedidos', order.id, 'editar']);
  }

  deleteOrder(order: Order): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Excluir Pedido',
        message: `Tem certeza que deseja excluir o pedido #${order.id}?`
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.orderService.delete(order.id).subscribe({
        next: () => {
          this.orders = this.orders.filter(o => o.id !== order.id);
          this.snackBar.open('Pedido excluído', 'OK', { duration: 2500 });
        },
        error: () => {
          this.snackBar.open('Erro ao excluir pedido', 'OK', { duration: 3000 });
        }
      });
    });
  }

  private loadOrders(): void {
    this.loading = true;
    this.orderService.getAll().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: () => {
        this.orders = [];
        this.loading = false;
      }
    });
  }
}
