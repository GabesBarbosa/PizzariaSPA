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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

import { Customer } from '../../../../shared/models';
import { CustomerService } from '../../../../core/services/customer.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatInputModule, MatFormFieldModule,
    MatButtonModule, MatIconModule, MatPaginatorModule,
    MatCardModule, MatTooltipModule, MatSnackBarModule,
    MatDialogModule, MatSlideToggleModule, LoadingComponent
  ],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss'
})
export class CustomerListComponent implements OnInit {
  allCustomers: Customer[] = [];
  customers: Customer[] = [];
  paginatedCustomers: Customer[] = [];
  displayedColumns = ['name', 'phone', 'actions'];
  loading = false;
  searchQuery = '';
  searchMode = false;
  pageSize = 10;
  pageIndex = 0;

  private searchSubject = new Subject<string>();

  constructor(
    private customerService: CustomerService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadAll();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (this.searchMode) {
        if (query.length >= 2) {
          this.loading = true;
          this.customerService.search(query).subscribe({
            next: (customers) => {
              this.customers = customers;
              this.pageIndex = 0;
              this.updatePagination();
              this.loading = false;
            },
            error: () => { this.loading = false; }
          });
        } else {
          this.customers = [];
          this.paginatedCustomers = [];
        }
      } else {
        this.filterCustomers(query);
      }
    });
  }

  toggleSearchMode(): void {
    this.searchMode = !this.searchMode;
    this.searchQuery = '';
    if (this.searchMode) {
      this.customers = [];
      this.paginatedCustomers = [];
    } else {
      this.customers = this.allCustomers;
      this.pageIndex = 0;
      this.updatePagination();
    }
  }

  loadAll(): void {
    this.loading = true;
    this.customerService.getAll().subscribe({
      next: (customers) => {
        this.allCustomers = customers;
        this.filterCustomers(this.searchQuery);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private filterCustomers(query: string): void {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.customers = this.allCustomers;
    } else {
      this.customers = this.allCustomers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    }
    this.pageIndex = 0;
    this.updatePagination();
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

  deleteCustomer(customer: Customer): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Excluir Cliente',
        message: `Tem certeza que deseja excluir o cliente "${customer.name}"?`
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.customerService.delete(customer.id).subscribe({
        next: () => {
          this.allCustomers = this.allCustomers.filter(c => c.id !== customer.id);
          this.filterCustomers(this.searchQuery);
          this.snackBar.open('Cliente excluído', 'OK', { duration: 2500 });
        },
        error: () => {
          this.snackBar.open('Erro ao excluir cliente', 'OK', { duration: 3000 });
        }
      });
    });
  }
}
