import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import {
  Chart,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

import { DashboardService } from '../../../../core/services/dashboard.service';

Chart.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatProgressSpinnerModule,
    BaseChartDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  loading = true;
  error = false;

  // KPIs
  todayRevenue = 0;
  todayOrders = 0;
  avgTicket = 0;
  topPizzaName = '—';
  avgDeliveryTime = 0;

  // 1. Vendas por período (line)
  salesChartData!: ChartConfiguration<'line'>['data'];
  salesChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: '📈 Vendas por Período (últimos 30 dias)', font: { size: 14 } }
    },
    scales: {
      y: {
        ticks: {
          callback: (val) => 'R$ ' + Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
        }
      }
    }
  };

  // 2. Pizzas mais vendidas (bar horizontal)
  pizzasChartData!: ChartConfiguration<'bar'>['data'];
  pizzasChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      title: { display: true, text: '🍕 Pizzas Mais Vendidas', font: { size: 14 } }
    }
  };

  // 3. Vendas por categoria (doughnut)
  categoryChartData!: ChartConfiguration<'doughnut'>['data'];
  categoryChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: '📊 Vendas por Categoria', font: { size: 14 } }
    }
  };

  // 4. Formas de pagamento (doughnut)
  paymentChartData!: ChartConfiguration<'doughnut'>['data'];
  paymentChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: '💳 Formas de Pagamento', font: { size: 14 } }
    }
  };

  // 5. Pedidos por horário (bar)
  hourChartData!: ChartConfiguration<'bar'>['data'];
  hourChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: '🕐 Pedidos por Horário', font: { size: 14 } }
    },
    scales: {
      x: { title: { display: true, text: 'Hora' } },
      y: { beginAtZero: true }
    }
  };

  // 6. Ticket médio (line)
  ticketChartData!: ChartConfiguration<'line'>['data'];
  ticketChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: '💰 Ticket Médio por Dia', font: { size: 14 } }
    },
    scales: {
      y: {
        ticks: {
          callback: (val) => 'R$ ' + Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
        }
      }
    }
  };

  // 7. Pedidos por canal (bar)
  channelChartData!: ChartConfiguration<'bar'>['data'];
  channelChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: '📱 Pedidos por Canal de Venda', font: { size: 14 } }
    }
  };

  // 8. Status dos pedidos (bar)
  statusChartData!: ChartConfiguration<'bar'>['data'];
  statusChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: '📋 Status dos Pedidos', font: { size: 14 } }
    }
  };

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.getAnalytics().subscribe({
      next: (data) => {
        this.buildCharts(data);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  private buildCharts(data: any): void {
    // KPIs
    this.todayRevenue = data.todayRevenue;
    this.todayOrders = data.todayOrders;
    this.avgTicket = data.avgTicket;
    this.topPizzaName = data.topPizzaName;
    this.avgDeliveryTime = data.avgDeliveryTime;

    // 1. Vendas por período
    const days = data.salesByDay.map((r: any) =>
      new Date(r.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    );
    this.salesChartData = {
      labels: days,
      datasets: [{
        data: data.salesByDay.map((r: any) => r.revenue),
        borderColor: '#388e3c',
        backgroundColor: 'rgba(56, 142, 60, 0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: 3
      }]
    };

    // 2. Pizzas mais vendidas
    const pizzaColors = [
      '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5',
      '#8e24aa', '#00acc1', '#6d4c41', '#546e7a', '#d81b60'
    ];
    this.pizzasChartData = {
      labels: data.topProducts.map((p: any) => p.name),
      datasets: [{
        data: data.topProducts.map((p: any) => p.totalSold),
        backgroundColor: pizzaColors.slice(0, data.topProducts.length)
      }]
    };

    // 3. Vendas por categoria (doughnut)
    const catColors = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa', '#ff7043', '#bdbdbd'];
    this.categoryChartData = {
      labels: data.revenueByCategory.map((c: any) => c.category),
      datasets: [{
        data: data.revenueByCategory.map((c: any) => c.totalRevenue),
        backgroundColor: catColors.slice(0, data.revenueByCategory.length)
      }]
    };

    // 4. Formas de pagamento
    const paymentLabels: Record<string, string> = {
      dinheiro: '💵 Dinheiro', cartao_credito: '💳 Cartão Crédito',
      cartao_debito: '💳 Cartão Débito', pix: '📱 Pix', nao_informado: 'Não informado'
    };
    this.paymentChartData = {
      labels: data.revenueByPayment.map((p: any) => paymentLabels[p.method] || p.method),
      datasets: [{
        data: data.revenueByPayment.map((p: any) => p.revenue),
        backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#bdbdbd']
      }]
    };

    // 5. Pedidos por horário
    const hours = Array.from({ length: 24 }, (_, i) => `${i}h`);
    const hourCounts = new Array(24).fill(0);
    data.ordersByHour.forEach((h: any) => { hourCounts[h.hour] = h.count; });
    this.hourChartData = {
      labels: hours,
      datasets: [{
        data: hourCounts,
        backgroundColor: hourCounts.map((c: number) =>
          c >= 50 ? '#e53935' : c >= 20 ? '#ff9800' : '#42a5f5'
        )
      }]
    };

    // 6. Ticket médio por dia
    const ticketDays = data.ticketByDay.map((r: any) =>
      new Date(r.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    );
    this.ticketChartData = {
      labels: ticketDays,
      datasets: [{
        data: data.ticketByDay.map((r: any) => r.avgTicket),
        borderColor: '#f57c00',
        backgroundColor: 'rgba(245, 124, 0, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3
      }]
    };

    // 7. Pedidos por canal
    const channelLabels: Record<string, string> = {
      balcao: 'Balcão', delivery: 'Delivery', whatsapp: 'WhatsApp',
      ifood: 'iFood', telefone: 'Telefone', site: 'Site/App'
    };
    const channelColors: Record<string, string> = {
      balcao: '#1976d2', delivery: '#e53935', whatsapp: '#25d366',
      ifood: '#ea1d2c', telefone: '#ff9800', site: '#8e24aa'
    };
    this.channelChartData = {
      labels: data.ordersByChannel.map((c: any) => channelLabels[c.channel] || c.channel),
      datasets: [{
        data: data.ordersByChannel.map((c: any) => c.count),
        backgroundColor: data.ordersByChannel.map((c: any) => channelColors[c.channel] || '#bdbdbd')
      }]
    };

    // 8. Status dos pedidos
    const statusLabels: Record<string, string> = {
      RECEIVED: '🟡 Recebido', PREPARING: '🔵 Em preparo',
      OUT_FOR_DELIVERY: '🟣 Em entrega', DELIVERED: '🟢 Finalizado',
      CANCELLED: '🔴 Cancelado'
    };
    const statusColors: Record<string, string> = {
      RECEIVED: '#fdd835', PREPARING: '#42a5f5',
      OUT_FOR_DELIVERY: '#ab47bc', DELIVERED: '#66bb6a',
      CANCELLED: '#ef5350'
    };
    this.statusChartData = {
      labels: data.ordersByStatus.map((s: any) => statusLabels[s.status] || s.status),
      datasets: [{
        data: data.ordersByStatus.map((s: any) => s.count),
        backgroundColor: data.ordersByStatus.map((s: any) => statusColors[s.status] || '#bdbdbd')
      }]
    };
  }

  formatBrl(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
