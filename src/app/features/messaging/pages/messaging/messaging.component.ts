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
import { MatTabsModule } from '@angular/material/tabs';

import { Customer } from '../../../../shared/models';
import { CustomerService } from '../../../../core/services/customer.service';
import { WhatsappService, WhatsappStatus, BulkResult } from '../../../../core/services/whatsapp.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-messaging',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatCheckboxModule,
    MatSnackBarModule, MatDividerModule, MatListModule,
    MatProgressBarModule, MatTabsModule, LoadingComponent
  ],
  templateUrl: './messaging.component.html',
  styleUrl: './messaging.component.scss'
})
export class MessagingComponent implements OnInit {
  // Connection status
  whatsappStatus?: WhatsappStatus;
  checkingStatus = true;

  // Bulk tab
  customers: Customer[] = [];
  selectedIds = new Set<string>();
  bulkMessage = '';
  sending = false;
  loading = true;
  result?: BulkResult;
  selectAll = false;

  // Single tab
  singlePhone = '';
  singleMessage = '';
  sendingSingle = false;

  // Send all tab
  allMessage = '';
  sendingAll = false;
  allResult?: BulkResult;

  constructor(
    private customerService: CustomerService,
    private whatsappService: WhatsappService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.checkConnection();
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

  checkConnection(): void {
    this.checkingStatus = true;
    this.whatsappService.getStatus().subscribe({
      next: (status) => {
        this.whatsappStatus = status;
        this.checkingStatus = false;
      },
      error: () => {
        this.whatsappStatus = { connected: false, qrCode: null };
        this.checkingStatus = false;
      }
    });
  }

  // ── Bulk send ──
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

  get canSendBulk(): boolean {
    return this.selectedIds.size > 0 && this.bulkMessage.trim().length > 0 && !this.sending;
  }

  sendBulk(): void {
    const phones = this.customers
      .filter(c => this.selectedIds.has(c.id))
      .map(c => c.phone);

    if (phones.length === 0 || !this.bulkMessage.trim()) return;

    this.sending = true;
    this.result = undefined;

    this.whatsappService.sendBulk(phones, this.bulkMessage.trim()).subscribe({
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

  // ── Single send ──
  get canSendSingle(): boolean {
    return this.singlePhone.trim().length > 0 && this.singleMessage.trim().length > 0 && !this.sendingSingle;
  }

  sendSingle(): void {
    if (!this.canSendSingle) return;
    this.sendingSingle = true;
    this.whatsappService.send({ phone: this.singlePhone.trim(), message: this.singleMessage.trim() }).subscribe({
      next: () => {
        this.sendingSingle = false;
        this.snackBar.open('Mensagem enviada com sucesso!', 'OK', { duration: 4000 });
        this.singleMessage = '';
      },
      error: (err) => {
        this.sendingSingle = false;
        const msg = err.error?.error || 'Erro ao enviar mensagem';
        this.snackBar.open(msg, 'OK', { duration: 5000 });
      }
    });
  }

  // ── Send to all ──
  get canSendAll(): boolean {
    return this.allMessage.trim().length > 0 && !this.sendingAll;
  }

  sendToAll(): void {
    if (!this.canSendAll) return;
    this.sendingAll = true;
    this.allResult = undefined;
    this.whatsappService.sendToAll(this.allMessage.trim()).subscribe({
      next: (result) => {
        this.allResult = result;
        this.sendingAll = false;
        const msg = `Enviado para ${result.success.length} de ${result.totalCustomers} clientes`;
        this.snackBar.open(msg, 'OK', { duration: 5000 });
      },
      error: (err) => {
        this.sendingAll = false;
        const msg = err.error?.error || 'Erro ao enviar mensagens';
        this.snackBar.open(msg, 'OK', { duration: 5000 });
      }
    });
  }
}
