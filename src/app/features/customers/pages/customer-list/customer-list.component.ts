import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

import { Customer } from '../../../../shared/models';
import { CustomerService } from '../../../../core/services/customer.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatInputModule, MatFormFieldModule,
    MatButtonModule, MatIconModule, MatPaginatorModule,
    MatCardModule, LoadingComponent
  ],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss'
})
export class CustomerListComponent implements OnInit {
  customers: Customer[] = [];
  paginatedCustomers: Customer[] = [];
  displayedColumns = ['name', 'phone', 'actions'];
  loading = false;
  searchQuery = '';
  pageSize = 10;
  pageIndex = 0;

  private searchSubject = new Subject<string>();

  constructor(private customerService: CustomerService) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 2) return of([]);
        this.loading = true;
        return this.customerService.search(query);
      })
    ).subscribe(customers => {
      this.customers = customers;
      this.pageIndex = 0;
      this.updatePagination();
      this.loading = false;
    });
  }

  onSearch(query: string): void {
    this.searchSubject.next(query);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagination();
  }

  private updatePagination(): void {
    const start = this.pageIndex * this.pageSize;
    this.paginatedCustomers = this.customers.slice(start, start + this.pageSize);
  }
}
