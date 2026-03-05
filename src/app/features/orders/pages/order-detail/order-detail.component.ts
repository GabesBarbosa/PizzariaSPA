import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Order, OrderStatus } from '../../../../shared/models';
import { OrderService } from '../../../../core/services/order.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';
import { ORDER_STATUS_LABELS, ORDER_STATUS_FLOW } from '../../../../shared/utils/order-status.util';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatListModule, MatChipsModule, MatDividerModule,
    MatSelectModule, MatSnackBarModule, LoadingComponent, BrlPipe
  ],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss'
})
export class OrderDetailComponent implements OnInit {
  order?: Order;
  loading = true;
  newStatus?: OrderStatus;
  updatingStatus = false;
  readonly statusLabels = ORDER_STATUS_LABELS;
  readonly statusFlow = ORDER_STATUS_FLOW;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.loadOrder(id);
  }

  get availableStatuses(): OrderStatus[] {
    if (!this.order) return [];
    const currentIdx = this.statusFlow.indexOf(this.order.status);
    return this.statusFlow.slice(currentIdx + 1);
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as keyof typeof this.statusLabels] || status;
  }

  updateStatus(): void {
    if (!this.order || !this.newStatus) return;
    this.updatingStatus = true;

    this.orderService.updateStatus(this.order.id, this.newStatus).subscribe({
      next: (updated) => {
        this.order = updated;
        this.newStatus = undefined;
        this.updatingStatus = false;
        this.snackBar.open('Status atualizado!', 'OK', { duration: 3000 });
      },
      error: () => {
        this.updatingStatus = false;
      }
    });
  }

  private loadOrder(id: number): void {
    this.orderService.getById(id).subscribe(order => {
      this.order = order;
      this.loading = false;
    });
  }
}
