import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NgApexchartsModule } from 'ng-apexcharts';
import { forkJoin } from 'rxjs';

import { DashboardService, DashboardPeriod } from '../../../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatProgressSpinnerModule,
    MatButtonToggleModule, NgApexchartsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  loading = true;
  error = false;
  selectedPeriod: DashboardPeriod = 'day';

  // KPIs Vendas
  todayRevenue = 0;
  todayOrders = 0;
  avgTicket = 0;
  topProductName = '---';
  avgDeliveryTime = 0;

  // KPIs Clientes
  totalCustomers = 0;
  newCustomersPeriod = 0;
  recurringCustomers = 0;
  returnRate = 0;
  avgCLV = 0;

  // Charts Vendas
  salesChart!: any;
  pizzasChart!: any;
  categoryChart!: any;
  paymentChart!: any;
  hourChart!: any;
  ticketChart!: any;
  channelChart!: any;
  statusChart!: any;

  // Charts Clientes
  newByDayChart!: any;
  newVsRecurringChart!: any;
  loyaltyChart!: any;
  returnRateChart!: any;
  growthChart!: any;
  topCustomersChart!: any;
  avgIntervalChart!: any;

  chartsReady = false;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadData();
  }

  onPeriodChange(period: DashboardPeriod): void {
    this.selectedPeriod = period;
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.error = false;
    this.chartsReady = false;
    forkJoin({
      analytics: this.dashboardService.getAnalytics(this.selectedPeriod),
      customers: this.dashboardService.getCustomerAnalytics(this.selectedPeriod)
    }).subscribe({
      next: ({ analytics, customers }) => {
        this.buildSalesCharts(analytics);
        this.buildCustomerCharts(customers);
        this.chartsReady = true;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  formatBrl(value: number): string {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private buildSalesCharts(d: any): void {
    this.todayRevenue = d.todayRevenue;
    this.todayOrders = d.todayOrders;
    this.avgTicket = d.avgTicket;
    this.topProductName = d.topProductName;
    this.avgDeliveryTime = d.avgDeliveryTime;

    const days = (d.salesByDay || []).map((r: any) =>
      new Date(r.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    );
    this.salesChart = {
      series: [{ name: 'Faturamento', data: (d.salesByDay || []).map((r: any) => r.revenue || 0) }],
      chart: { type: 'area', height: 320, toolbar: { show: false }, fontFamily: 'inherit' },
      title: { text: 'Vendas por Periodo', style: { fontSize: '14px', fontWeight: 600 } },
      xaxis: { categories: days },
      yaxis: { labels: { formatter: (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR') } },
      stroke: { curve: 'smooth', width: 2.5 },
      colors: ['#388e3c'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
      dataLabels: { enabled: false },
      grid: { borderColor: '#f0f0f0' },
      tooltip: { y: { formatter: (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) } }
    };

    const topProducts = d.topProducts || [];
    this.pizzasChart = {
      series: [{ name: 'Vendidos', data: topProducts.map((p: any) => p.totalSold || 0) }],
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      title: { text: 'Produtos Mais Vendidos', style: { fontSize: '14px', fontWeight: 600 } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
      xaxis: { categories: topProducts.map((p: any) => p.name) },
      colors: ['#e53935'],
      dataLabels: { enabled: true, style: { fontSize: '11px' } },
      grid: { borderColor: '#f0f0f0' },
      tooltip: { y: { formatter: (v: number) => v + ' un.' } }
    };

    const cats = d.revenueByCategory || [];
    const catColors = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa', '#ff7043', '#78909c'];
    this.categoryChart = {
      series: cats.map((c: any) => c.totalRevenue || 0),
      chart: { type: 'donut', height: 300, fontFamily: 'inherit' },
      title: { text: 'Vendas por Categoria', style: { fontSize: '14px', fontWeight: 600 } },
      labels: cats.map((c: any) => c.category || 'N/A'),
      colors: catColors.slice(0, cats.length),
      legend: { position: 'bottom', fontSize: '12px' },
      dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(1) + '%' },
      tooltip: { y: { formatter: (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) } }
    };

    const payMap: Record<string, string> = {
      dinheiro: 'Dinheiro', cartao_credito: 'Cartao Credito',
      cartao_debito: 'Cartao Debito', pix: 'Pix', nao_informado: 'N/I'
    };
    const pay = d.revenueByPayment || [];
    this.paymentChart = {
      series: pay.map((p: any) => p.revenue || 0),
      chart: { type: 'donut', height: 300, fontFamily: 'inherit' },
      title: { text: 'Formas de Pagamento', style: { fontSize: '14px', fontWeight: 600 } },
      labels: pay.map((p: any) => payMap[p.method] || p.method),
      colors: ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#bdbdbd'],
      legend: { position: 'bottom', fontSize: '12px' },
      dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(1) + '%' },
      tooltip: { y: { formatter: (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) } }
    };

    const hourCounts = new Array(24).fill(0);
    (d.ordersByHour || []).forEach((h: any) => { hourCounts[h.hour] = h.count; });
    this.hourChart = {
      series: [{ name: 'Pedidos', data: hourCounts }],
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      title: { text: 'Pedidos por Horario', style: { fontSize: '14px', fontWeight: 600 } },
      plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
      xaxis: { categories: Array.from({ length: 24 }, (_, i) => i + 'h') },
      colors: ['#42a5f5'],
      dataLabels: { enabled: false },
      grid: { borderColor: '#f0f0f0' },
      tooltip: { y: { formatter: (v: number) => v + ' pedidos' } }
    };

    const ticketDays = (d.ticketByDay || []).map((r: any) =>
      new Date(r.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    );
    this.ticketChart = {
      series: [{ name: 'Ticket Medio', data: (d.ticketByDay || []).map((r: any) => r.avgTicket || 0) }],
      chart: { type: 'area', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      title: { text: 'Ticket Medio por Dia', style: { fontSize: '14px', fontWeight: 600 } },
      xaxis: { categories: ticketDays },
      yaxis: { labels: { formatter: (v: number) => 'R$ ' + (v || 0).toFixed(0) } },
      stroke: { curve: 'smooth', width: 2.5 },
      colors: ['#f57c00'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
      dataLabels: { enabled: false },
      grid: { borderColor: '#f0f0f0' },
      tooltip: { y: { formatter: (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) } }
    };

    const chLabels: Record<string, string> = {
      balcao: 'Balcao', delivery: 'Delivery', whatsapp: 'WhatsApp',
      ifood: 'iFood', telefone: 'Telefone', site: 'Site/App'
    };
    const chColors: Record<string, string> = {
      balcao: '#1976d2', delivery: '#e53935', whatsapp: '#25d366',
      ifood: '#ea1d2c', telefone: '#ff9800', site: '#8e24aa'
    };
    const channels = d.ordersByChannel || [];
    this.channelChart = {
      series: [{ name: 'Pedidos', data: channels.map((c: any) => c.count || 0) }],
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      title: { text: 'Pedidos por Canal de Venda', style: { fontSize: '14px', fontWeight: 600 } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '50%', distributed: true } },
      xaxis: { categories: channels.map((c: any) => chLabels[c.channel] || c.channel) },
      colors: channels.map((c: any) => chColors[c.channel] || '#bdbdbd'),
      legend: { show: false },
      dataLabels: { enabled: true },
      grid: { borderColor: '#f0f0f0' },
      tooltip: { y: { formatter: (v: number) => v + ' pedidos' } }
    };

    const stLabels: Record<string, string> = {
      RECEIVED: 'Recebido', PREPARING: 'Em preparo',
      OUT_FOR_DELIVERY: 'Em entrega', DELIVERED: 'Finalizado', CANCELLED: 'Cancelado'
    };
    const stColors: Record<string, string> = {
      RECEIVED: '#fdd835', PREPARING: '#42a5f5',
      OUT_FOR_DELIVERY: '#ab47bc', DELIVERED: '#66bb6a', CANCELLED: '#ef5350'
    };
    const statuses = d.ordersByStatus || [];
    this.statusChart = {
      series: [{ name: 'Pedidos', data: statuses.map((s: any) => s.count || 0) }],
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      title: { text: 'Status dos Pedidos', style: { fontSize: '14px', fontWeight: 600 } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '45%', distributed: true } },
      xaxis: { categories: statuses.map((s: any) => stLabels[s.status] || s.status) },
      colors: statuses.map((s: any) => stColors[s.status] || '#bdbdbd'),
      legend: { show: false },
      dataLabels: { enabled: true },
      grid: { borderColor: '#f0f0f0' },
      tooltip: { y: { formatter: (v: number) => v + ' pedidos' } }
    };
  }

  private buildCustomerCharts(d: any): void {
    this.totalCustomers = d.totalCustomers || 0;
    this.newCustomersPeriod = d.newCustomersPeriod || 0;
    this.recurringCustomers = d.recurringCustomers || 0;
    this.returnRate = d.returnRate || 0;
    this.avgCLV = d.avgCLV || 0;

    const newDays = (d.newByDay || []).map((r: any) =>
      new Date(r.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    );
    this.newByDayChart = {
      series: [{ name: 'Novos Clientes', data: (d.newByDay || []).map((r: any) => r.count || 0) }],
      chart: { type: 'area', height: 320, toolbar: { show: false }, fontFamily: 'inherit' },
      title: { text: 'Novos Clientes por Periodo', style: { fontSize: '14px', fontWeight: 600 } },
      xaxis: { categories: newDays },
      yaxis: { labels: { formatter: (v: number) => Math.round(v).toString() } },
      stroke: { curve: 'smooth', width: 2.5 },
      colors: ['#42a5f5'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
      dataLabels: { enabled: false },
      grid: { borderColor: '#f0f0f0' },
      tooltip: { y: { formatter: (v: number) => v + ' clientes' } }
    };

    const nvr = d.newVsRecurring || { newCustomers: 0, recurringCustomers: 0 };
    this.newVsRecurringChart = {
      series: [nvr.newCustomers || 0, nvr.recurringCustomers || 0],
      chart: { type: 'donut', height: 300, fontFamily: 'inherit' },
      title: { text: 'Novos vs Recorrentes', style: { fontSize: '14px', fontWeight: 600 } },
      labels: ['Novos', 'Recorrentes'],
      colors: ['#66bb6a', '#42a5f5'],
      legend: { position: 'bottom', fontSize: '13px' },
      dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(1) + '%' },
      plotOptions: { pie: { donut: { size: '60%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '14px' } } } } }
    };

    const li = d.loyaltyIndex || { oneOrder: 0, twoThreeOrders: 0, fourPlusOrders: 0 };
    this.loyaltyChart = {
      series: [{ name: 'Clientes', data: [li.oneOrder || 0, li.twoThreeOrders || 0, li.fourPlusOrders || 0] }],
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      title: { text: 'Indice de Fidelidade', style: { fontSize: '14px', fontWeight: 600 } },
      plotOptions: { bar: { borderRadius: 6, columnWidth: '45%', distributed: true } },
      xaxis: { categories: ['1 pedido', '2-3 pedidos', '4+ pedidos'] },
      colors: ['#ef5350', '#ffa726', '#66bb6a'],
      legend: { show: false },
      dataLabels: { enabled: true, style: { fontSize: '12px', fontWeight: 700 } },
      grid: { borderColor: '#f0f0f0' },
      tooltip: { y: { formatter: (v: number) => v + ' clientes' } }
    };

    const retMonths = d.returnByMonth || [];
    this.returnRateChart = {
      series: [{ name: 'Taxa de Retorno', data: retMonths.map((r: any) => r.returnRate || 0) }],
      chart: { type: 'line', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      title: { text: 'Taxa de Retorno (%)', style: { fontSize: '14px', fontWeight: 600 } },
      xaxis: { categories: retMonths.map((r: any) => r.month) },
      yaxis: { min: 0, max: 100, labels: { formatter: (v: number) => v.toFixed(0) + '%' } },
      stroke: { curve: 'smooth', width: 3 },
      colors: ['#ab47bc'],
      markers: { size: 5, strokeWidth: 0 },
      dataLabels: { enabled: false },
      grid: { borderColor: '#f0f0f0' },
      tooltip: { y: { formatter: (v: number) => v.toFixed(1) + '%' } }
    };

    const growth = d.customerGrowth || [];
    this.growthChart = {
      series: [{ name: 'Total Clientes', data: growth.map((r: any) => r.total || 0) }],
      chart: { type: 'area', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      title: { text: 'Crescimento da Base de Clientes', style: { fontSize: '14px', fontWeight: 600 } },
      xaxis: { categories: growth.map((r: any) => r.month) },
      yaxis: { labels: { formatter: (v: number) => Math.round(v).toString() } },
      stroke: { curve: 'smooth', width: 2.5 },
      colors: ['#26a69a'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
      dataLabels: { enabled: true, formatter: (v: number) => Math.round(v).toString(), style: { fontSize: '11px' } },
      grid: { borderColor: '#f0f0f0' },
      tooltip: { y: { formatter: (v: number) => v + ' clientes' } }
    };

    const top = d.topCustomers || [];
    this.topCustomersChart = {
      series: [{ name: 'Total Gasto', data: top.map((r: any) => r.totalSpent || 0) }],
      chart: { type: 'bar', height: 340, toolbar: { show: false }, fontFamily: 'inherit' },
      title: { text: 'Ranking Melhores Clientes', style: { fontSize: '14px', fontWeight: 600 } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
      xaxis: { categories: top.map((r: any) => r.name), labels: { formatter: (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR') } },
      colors: ['#ff7043'],
      dataLabels: {
        enabled: true,
        formatter: (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        style: { fontSize: '11px' }
      },
      grid: { borderColor: '#f0f0f0' },
      tooltip: { y: { formatter: (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) } }
    };

    const interval = d.avgOrderInterval || [];
    this.avgIntervalChart = {
      series: [{ name: 'Dias', data: interval.map((r: any) => r.avgDays || 0) }],
      chart: { type: 'line', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
      title: { text: 'Tempo Medio entre Pedidos (dias)', style: { fontSize: '14px', fontWeight: 600 } },
      xaxis: { categories: interval.map((r: any) => r.month) },
      yaxis: { min: 0, labels: { formatter: (v: number) => Math.round(v) + ' dias' } },
      stroke: { curve: 'smooth', width: 3 },
      colors: ['#5c6bc0'],
      markers: { size: 5, strokeWidth: 0 },
      dataLabels: { enabled: true, formatter: (v: number) => Math.round(v) + 'd', style: { fontSize: '11px' } },
      grid: { borderColor: '#f0f0f0' },
      tooltip: { y: { formatter: (v: number) => v + ' dias' } }
    };
  }
}
