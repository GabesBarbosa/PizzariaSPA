import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DashboardStats } from '../../../../shared/models';
import { DashboardService, DashboardPeriod } from '../../../../core/services/dashboard.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatChipsModule, MatProgressSpinnerModule,
    MatButtonToggleModule, MatFormFieldModule, MatInputModule,
    MatSnackBarModule, BrlPipe
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  // Configurações
  deliveryFee: number = 0;
  deliveryFeeInput: number = 0;
  savingFee = false;

  // Dashboard
  stats?: DashboardStats;
  loading = true;
  error = false;
  selectedPeriod: DashboardPeriod = 'day';
  recentOrderColumns = ['customer', 'total', 'status', 'date'];
  topProductColumns = ['name', 'sold', 'revenue'];

  constructor(
    private dashboardService: DashboardService,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadStats();
  }

  private loadSettings(): void {
    this.settingsService.getSettings().subscribe({
      next: (s) => {
        this.deliveryFee = s.deliveryFee;
        this.deliveryFeeInput = s.deliveryFee;
      }
    });
  }

  saveDeliveryFee(): void {
    this.savingFee = true;
    this.settingsService.updateDeliveryFee(this.deliveryFeeInput).subscribe({
      next: (s) => {
        this.deliveryFee = s.deliveryFee;
        this.savingFee = false;
        this.snackBar.open('Taxa de entrega atualizada!', 'OK', { duration: 3000 });
      },
      error: () => {
        this.savingFee = false;
        this.snackBar.open('Erro ao salvar.', 'OK', { duration: 3000 });
      }
    });
  }

  onPeriodChange(period: DashboardPeriod): void {
    this.selectedPeriod = period;
    this.loadStats();
  }

  private loadStats(): void {
    this.loading = true;
    this.error = false;
    this.dashboardService.getStats(this.selectedPeriod).subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      RECEIVED: 'Recebido',
      PREPARING: 'Preparando',
      OUT_FOR_DELIVERY: 'Saiu p/ Entrega',
      DELIVERED: 'Entregue'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      RECEIVED: '#1976d2',
      PREPARING: '#f57c00',
      OUT_FOR_DELIVERY: '#7b1fa2',
      DELIVERED: '#388e3c'
    };
    return colors[status] || '#757575';
  }
}
