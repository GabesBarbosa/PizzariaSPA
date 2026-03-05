import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Subject, debounceTime, switchMap, of } from 'rxjs';

import { Customer, Order } from '../../../../shared/models';
import { CustomerService } from '../../../../core/services/customer.service';
import { OrderService } from '../../../../core/services/order.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';
import { ORDER_STATUS_LABELS } from '../../../../shared/utils/order-status.util';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatCardModule, MatChipsModule, MatFormFieldModule,
    MatInputModule, MatAutocompleteModule,
    LoadingComponent, BrlPipe
  ],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss'
})
export class OrderListComponent {
  orders: Order[] = [];
  loading = false;
  searchQuery = '';
  filteredCustomers: Customer[] = [];
  selectedCustomer?: Customer;
  displayedColumns = ['id', 'total', 'status', 'createdAt', 'actions'];
  readonly statusLabels = ORDER_STATUS_LABELS;

  private searchSubject = new Subject<string>();

  constructor(
    private customerService: CustomerService,
    private orderService: OrderService,
    private router: Router
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      switchMap(query => {
        if (typeof query === 'string' && query.length >= 2) {
          return this.customerService.search(query);
        }
        return of([]);
      })
    ).subscribe(customers => {
      this.filteredCustomers = customers;
    });
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  selectCustomer(customer: Customer): void {
    this.selectedCustomer = customer;
    this.searchQuery = customer.name;
    this.loadOrders(customer.id);
  }

  displayCustomer(customer: Customer): string {
    return customer ? `${customer.name} - ${customer.phone}` : '';
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as keyof typeof this.statusLabels] || status;
  }

  viewOrder(order: Order): void {
    this.router.navigate(['/pedidos', order.id], { state: { order } });
  }

  private loadOrders(customerId: string): void {
    this.loading = true;
    this.orderService.getByCustomer(customerId).subscribe({
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
