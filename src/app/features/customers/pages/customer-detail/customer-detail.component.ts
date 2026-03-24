import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Customer } from '../../../../shared/models';
import { Order } from '../../../../shared/models';
import { CustomerService } from '../../../../core/services/customer.service';
import { OrderService } from '../../../../core/services/order.service';
import { WhatsappService } from '../../../../core/services/whatsapp.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';
import { PhonePipe } from '../../../../shared/utils/phone.pipe';
import { ORDER_STATUS_LABELS } from '../../../../shared/utils/order-status.util';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatListModule, MatChipsModule, MatFormFieldModule,
    MatInputModule, MatSnackBarModule, MatProgressBarModule,
    LoadingComponent, BrlPipe, PhonePipe
  ],
  templateUrl: './customer-detail.component.html',
  styleUrl: './customer-detail.component.scss'
})
export class CustomerDetailComponent implements OnInit {
  customer?: Customer;
  orders: Order[] = [];
  loading = true;
  readonly statusLabels = ORDER_STATUS_LABELS;

  // WhatsApp quick-send
  showWhatsappForm = false;
  whatsappMessage = '';
  sendingWhatsapp = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private orderService: OrderService,
    private whatsappService: WhatsappService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.customerService.getById(id).subscribe(customer => {
      this.customer = customer;
      this.loadOrders(customer.id);
    });
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status as keyof typeof this.statusLabels] || status;
  }

  viewOrder(order: Order): void {
    this.router.navigate(['/pedidos', order.id]);
  }

  sendWhatsapp(): void {
    if (!this.customer || !this.whatsappMessage.trim()) return;
    this.sendingWhatsapp = true;
    this.whatsappService.send({ phone: this.customer.phone, message: this.whatsappMessage.trim() }).subscribe({
      next: () => {
        this.sendingWhatsapp = false;
        this.showWhatsappForm = false;
        this.whatsappMessage = '';
        this.snackBar.open('Mensagem enviada via WhatsApp!', 'OK', { duration: 4000 });
      },
      error: (err) => {
        this.sendingWhatsapp = false;
        const msg = err.error?.error || 'Erro ao enviar mensagem';
        this.snackBar.open(msg, 'OK', { duration: 5000 });
      }
    });
  }

  private loadOrders(customerId: string): void {
    this.orderService.getByCustomer(customerId).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
