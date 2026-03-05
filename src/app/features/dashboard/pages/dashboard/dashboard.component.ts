import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { forkJoin } from 'rxjs';

import { Order } from '../../../../shared/models';
import { OrderService } from '../../../../core/services/order.service';
import { CustomerService } from '../../../../core/services/customer.service';
import { ProductService } from '../../../../core/services/product.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';
import { ORDER_STATUS_LABELS } from '../../../../shared/utils/order-status.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule,
    MatListModule, MatChipsModule, MatDividerModule,
    LoadingComponent, BrlPipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  loading = true;
  todayOrders: Order[] = [];
  activeOrders: Order[] = [];
  todayRevenue = 0;
  totalCustomers = 0;
  totalProducts = 0;
  readonly statusLabels = ORDER_STATUS_LABELS;

  constructor(
    private orderService: OrderService,
    private customerService: CustomerService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    forkJoin({
      orders: this.orderService.getAll(),
      customers: this.customerService.getAll(),
      products: this.productService.getAll()
    }).subscribe(({ orders, customers, products }) => {
      const today = new Date().toISOString().split('T')[0];

      this.todayOrders = orders.filter(o =>
        o.createdAt?.startsWith(today)
      );

      this.activeOrders = orders.filter(o =>
        o.status === 'preparando' || o.status === 'saiu_para_entrega'
      );

      this.todayRevenue = this.todayOrders.reduce((sum, o) => sum + o.total, 0);
      this.totalCustomers = customers.length;
      this.totalProducts = products.length;
      this.loading = false;
    });
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as keyof typeof this.statusLabels] || status;
  }
}
