import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';

import { Customer } from '../../../../shared/models';
import { CustomerService } from '../../../../core/services/customer.service';
import { WhatsappService, WhatsappStatus, BulkResult } from '../../../../core/services/whatsapp.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

type SendMode = 'selected' | 'all' | 'custom';

@Component({
  selector: 'app-messaging',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatCheckboxModule,
    MatSnackBarModule, MatDividerModule, MatProgressBarModule,
    MatButtonToggleModule, MatChipsModule, LoadingComponent
  ],
  templateUrl: './messaging.component.html',
  styleUrl: './messaging.component.scss'
})
export class MessagingComponent implements OnInit, OnDestroy {
  // Connection
  whatsappStatus?: WhatsappStatus;
  checkingStatus = true;
  private pollInterval: any = null;

  // Data
  customers: Customer[] = [];
  loading = true;

  // Selection
  selectedIds = new Set<string>();
  selectAll = false;
  searchTerm = '';

  // Send mode
  sendMode: SendMode = 'selected';

  // Message
  message = '';
  customPhone = '';
  sending = false;
  result?: BulkResult;

  constructor(
    private customerService: CustomerService,
    private whatsappService: WhatsappService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.checkConnection();
    this.customerService.getAll().subscribe({
      next: (c) => { this.customers = c; this.loading = false; },
      error: () => { this.customers = []; this.loading = false; }
    });
  }

  checkConnection(): void {
    this.checkingStatus = true;
    this.whatsappService.getStatus().subscribe({
      next: (s) => {
        this.whatsappStatus = s;
        this.checkingStatus = false;
        if (!s.connected) {
          this.startPolling();
        } else {
          this.stopPolling();
        }
      },
      error: () => {
        this.whatsappStatus = { connected: false, qrCode: null };
        this.checkingStatus = false;
      }
    });
  }

  private startPolling(): void {
    if (this.pollInterval) return;
    // Só faz polling se não há QR visível (aguardando conexão após scan)
    // Quando QR está visível, usuário precisa escanear — não há motivo para checar
    if (this.whatsappStatus?.qrCode) return;
    this.pollInterval = setInterval(() => {
      this.whatsappService.getStatus().subscribe({
        next: (s) => {
          this.whatsappStatus = s;
          if (s.connected) this.stopPolling();
          // Se QR apareceu, para o polling — usuário precisa escanear
          if (s.qrCode) this.stopPolling();
        },
        error: () => {}
      });
    }, 10000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ── Filtering ──
  get filteredCustomers(): Customer[] {
    if (!this.searchTerm.trim()) return this.customers;
    const term = this.searchTerm.toLowerCase();
    return this.customers.filter(c =>
      c.name.toLowerCase().includes(term) || c.phone.includes(term)
    );
  }

  // ── Selection ──
  toggleSelectAll(): void {
    if (this.selectAll) {
      this.filteredCustomers.forEach(c => this.selectedIds.add(c.id));
    } else {
      this.filteredCustomers.forEach(c => this.selectedIds.delete(c.id));
    }
  }

  toggleCustomer(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.updateSelectAll();
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  updateSelectAll(): void {
    const filtered = this.filteredCustomers;
    this.selectAll = filtered.length > 0 && filtered.every(c => this.selectedIds.has(c.id));
  }

  // ── Send ──
  get recipientLabel(): string {
    switch (this.sendMode) {
      case 'selected': return `${this.selectedIds.size} cliente(s) selecionado(s)`;
      case 'all': return `Todos os ${this.customers.length} clientes`;
      case 'custom': return this.customPhone.trim() || 'Número avulso';
    }
  }

  get canSend(): boolean {
    if (!this.message.trim() || this.sending) return false;
    switch (this.sendMode) {
      case 'selected': return this.selectedIds.size > 0;
      case 'all': return this.customers.length > 0;
      case 'custom': return this.customPhone.trim().length > 0;
    }
  }

  send(): void {
    if (!this.canSend) return;
    this.sending = true;
    this.result = undefined;
    const msg = this.message.trim();

    switch (this.sendMode) {
      case 'selected': {
        const phones = this.customers
          .filter(c => this.selectedIds.has(c.id))
          .map(c => c.phone);
        this.whatsappService.sendBulk(phones, msg).subscribe({
          next: (r) => this.handleResult(r, phones.length),
          error: (e) => this.handleError(e)
        });
        break;
      }
      case 'all': {
        this.whatsappService.sendToAll(msg).subscribe({
          next: (r) => this.handleResult(r, r.totalCustomers || this.customers.length),
          error: (e) => this.handleError(e)
        });
        break;
      }
      case 'custom': {
        this.whatsappService.send({ phone: this.customPhone.trim(), message: msg }).subscribe({
          next: () => {
            this.sending = false;
            this.snackBar.open('Mensagem enviada com sucesso!', 'OK', { duration: 4000 });
          },
          error: (e) => this.handleError(e)
        });
        break;
      }
    }
  }

  private handleResult(r: BulkResult, total: number): void {
    this.result = r;
    this.sending = false;
    this.snackBar.open(`Enviado para ${r.success.length} de ${total} clientes`, 'OK', { duration: 5000 });
  }

  private handleError(err: any): void {
    this.sending = false;
    this.snackBar.open(err.error?.error || 'Erro ao enviar mensagens', 'OK', { duration: 5000 });
  }
}
