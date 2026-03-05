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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { Customer } from '../../../../shared/models';
import { CustomerService } from '../../../../core/services/customer.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatInputModule, MatFormFieldModule,
    MatButtonModule, MatIconModule, MatPaginatorModule,
    MatCardModule, MatDialogModule, LoadingComponent
  ],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss'
})
export class CustomerListComponent implements OnInit {
  customers: Customer[] = [];
  paginatedCustomers: Customer[] = [];
  displayedColumns = ['name', 'phone', 'email', 'actions'];
  loading = false;
  searchQuery = '';
  pageSize = 10;
  pageIndex = 0;

  private searchSubject = new Subject<string>();

  constructor(
    private customerService: CustomerService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCustomers();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        this.loading = true;
        return query
          ? this.customerService.search(query)
          : this.customerService.getAll();
      })
    ).subscribe(customers => {
      this.customers = customers;
      this.pageIndex = 0;
      this.updatePagination();
      this.loading = false;
    });
  }

  loadCustomers(): void {
    this.loading = true;
    this.customerService.getAll().subscribe(customers => {
      this.customers = customers;
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

  confirmDelete(customer: Customer): void {
    const data: ConfirmDialogData = {
      title: 'Confirmar exclusão',
      message: `Deseja realmente excluir o cliente "${customer.name}"?`
    };

    this.dialog.open(ConfirmDialogComponent, { data, width: '400px' })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.customerService.delete(customer.id).subscribe(() => this.loadCustomers());
        }
      });
  }

  private updatePagination(): void {
    const start = this.pageIndex * this.pageSize;
    this.paginatedCustomers = this.customers.slice(start, start + this.pageSize);
  }
}
