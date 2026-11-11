import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DashboardStats } from '../../../../shared/models';
import { DashboardService, DashboardPeriod } from '../../../../core/services/dashboard.service';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatChipsModule, MatProgressSpinnerModule,
    MatButtonToggleModule, MatTooltipModule, BrlPipe
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  stats?: DashboardStats;
  loading = true;
  error = false;
  selectedPeriod: DashboardPeriod = 'day';
  recentOrderColumns = ['customer', 'total', 'status', 'date'];
  topProductColumns = ['name', 'sold', 'revenue'];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadStats();
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
      DELIVERED: 'Entregue',
      CANCELLED: 'Cancelado'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      RECEIVED: '#1976d2',
      PREPARING: '#f57c00',
      OUT_FOR_DELIVERY: '#7b1fa2',
      DELIVERED: '#388e3c',
      CANCELLED: '#c62828'
    };
    return colors[status] || '#757575';
  }
}
