import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Customer } from '../../../../shared/models';
import { CustomerService } from '../../../../core/services/customer.service';
import { WhatsappService, BulkResult } from '../../../../core/services/whatsapp.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-messaging',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatCheckboxModule,
    MatSnackBarModule, MatDividerModule, MatListModule,
    MatProgressBarModule, LoadingComponent
  ],
  templateUrl: './messaging.component.html',
  styleUrl: './messaging.component.scss'
})
export class MessagingComponent implements OnInit {
  customers: Customer[] = [];
  selectedIds = new Set<string>();
  message = '';
  sending = false;
  loading = true;
  result?: BulkResult;
  selectAll = false;

  constructor(
    private customerService: CustomerService,
    private whatsappService: WhatsappService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.customerService.getAll().subscribe({
      next: (customers) => {
        this.customers = customers;
        this.loading = false;
      },
      error: () => {
        this.customers = [];
        this.loading = false;
      }
    });
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.customers.forEach(c => this.selectedIds.add(c.id));
    } else {
      this.selectedIds.clear();
    }
  }

  toggleCustomer(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.selectAll = this.selectedIds.size === this.customers.length;
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  get canSend(): boolean {
    return this.selectedIds.size > 0 && this.message.trim().length > 0 && !this.sending;
  }

  sendMessages(): void {
    const phones = this.customers
      .filter(c => this.selectedIds.has(c.id))
      .map(c => c.phone);

    if (phones.length === 0 || !this.message.trim()) return;

    this.sending = true;
    this.result = undefined;

    this.whatsappService.sendBulk(phones, this.message.trim()).subscribe({
      next: (result) => {
        this.result = result;
        this.sending = false;
        const msg = `Enviado para ${result.success.length} de ${phones.length} clientes`;
        this.snackBar.open(msg, 'OK', { duration: 5000 });
      },
      error: (err) => {
        this.sending = false;
        const msg = err.error?.error || 'Erro ao enviar mensagens';
        this.snackBar.open(msg, 'OK', { duration: 5000 });
      }
    });
  }
}
