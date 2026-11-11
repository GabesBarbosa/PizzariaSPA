import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { forkJoin } from 'rxjs';

import { DashboardService, DashboardPeriod, ExportSummary } from '../../../../core/services/dashboard.service';
import { AuthService } from '../../../../core/services/auth.service';

/** Data de hoje (horário local) no formato AAAA-MM-DD, usado pelos campos type="date". */
function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function brDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function escapeHtml(s: string): string {
  return (s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatProgressSpinnerModule,
    MatButtonToggleModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSnackBarModule, NgApexchartsModule
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

  // Exportação de relatórios (RF22 / RF25) — padrão: do dia 1º do mês até hoje
  exportFrom = isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  exportTo = isoDate(new Date());
  exportingCsv = false;
  exportingPdf = false;

  constructor(
    private dashboardService: DashboardService,
    private auth: AuthService,
    private snack: MatSnackBar,
  ) {}

  downloadCsv(): void {
    this.exportingCsv = true;
    this.dashboardService.exportOrdersCsv(this.exportFrom, this.exportTo).subscribe({
      next: (blob) => {
        this.exportingCsv = false;
        // Link temporário clicado por código para baixar o arquivo.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pedidos_${this.exportFrom}_${this.exportTo}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: (err) => {
        this.exportingCsv = false;
        this.showExportError(err);
      },
    });
  }

  printSummary(): void {
    // Abre a janela já no clique (antes da resposta), senão o navegador bloqueia o pop-up.
    const win = window.open('', '_blank', 'width=900,height=800');
    if (!win) {
      this.snack.open('Libere os pop-ups deste site para imprimir o relatório.', 'OK', { duration: 4000 });
      return;
    }
    win.document.write('<p style="font-family:sans-serif;padding:24px">Gerando relatório...</p>');

    this.exportingPdf = true;
    this.dashboardService.getExportSummary(this.exportFrom, this.exportTo).subscribe({
      next: (s) => {
        this.exportingPdf = false;
        win.document.open();
        win.document.write(this.buildReportHtml(s));
        win.document.close();
      },
      error: (err) => {
        this.exportingPdf = false;
        win.close();
        this.showExportError(err);
      },
    });
  }

  private showExportError(err: any): void {
    // Com responseType 'blob' a mensagem de erro também chega como blob.
    if (err?.error instanceof Blob) {
      err.error.text().then((t: string) => {
        let msg = 'Erro ao exportar relatório.';
        try { msg = JSON.parse(t).message || msg; } catch { /* mantém padrão */ }
        this.snack.open(msg, 'OK', { duration: 4000 });
      });
      return;
    }
    this.snack.open(err?.error?.message || 'Erro ao exportar relatório.', 'OK', { duration: 4000 });
  }

  private buildReportHtml(s: ExportSummary): string {
    const payLabels: Record<string, string> = {
      dinheiro: 'Dinheiro', cartao_credito: 'Cartão de crédito', cartao_debito: 'Cartão de débito',
      pix: 'Pix', CASH: 'Dinheiro', CREDIT: 'Crédito', DEBIT: 'Débito', PIX: 'Pix', nao_informado: 'Não informado',
    };
    const business = escapeHtml(this.auth.currentUser?.businessName || 'DashFood');
    const periodo = s.from === s.to ? brDate(s.from) : `${brDate(s.from)} a ${brDate(s.to)}`;
    const geradoEm = new Date().toLocaleString('pt-BR');

    const topRows = s.topProducts.length
      ? s.topProducts.map((p, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(p.name)}</td><td class="num">${p.quantity}</td><td class="num">${this.formatBrl(p.revenue)}</td></tr>`).join('')
      : '<tr><td colspan="4" class="empty">Nenhuma venda no período</td></tr>';
    const payRows = s.payments.length
      ? s.payments.map(p => `<tr><td>${escapeHtml(payLabels[p.method] || p.method)}</td><td class="num">${p.orders}</td><td class="num">${this.formatBrl(p.revenue)}</td></tr>`).join('')
      : '<tr><td colspan="3" class="empty">Nenhum pedido no período</td></tr>';

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Relatório ${business} - ${periodo}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #222; margin: 32px; }
        h1 { margin: 0; font-size: 22px; }
        .sub { color: #666; margin: 4px 0 24px; font-size: 13px; }
        .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .kpi { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
        .kpi .v { font-size: 20px; font-weight: 700; }
        .kpi .l { font-size: 12px; color: #666; margin-top: 4px; }
        h2 { font-size: 15px; margin: 24px 0 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border-bottom: 1px solid #eee; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; }
        .num { text-align: right; }
        .empty { text-align: center; color: #888; }
        .note { font-size: 12px; color: #666; margin-top: 24px; }
        .actions { margin-bottom: 16px; }
        .actions button { padding: 8px 16px; font-size: 14px; cursor: pointer; }
        @media print {
          body { margin: 12mm; }
          .actions { display: none; }
          .kpi, table { break-inside: avoid; }
        }
      </style></head><body>
      <div class="actions"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
      <h1>${business}</h1>
      <div class="sub">Relatório de vendas · ${periodo} · gerado em ${geradoEm}</div>
      <div class="kpis">
        <div class="kpi"><div class="v">${this.formatBrl(s.revenue)}</div><div class="l">Faturamento</div></div>
        <div class="kpi"><div class="v">${s.orders}</div><div class="l">Pedidos</div></div>
        <div class="kpi"><div class="v">${this.formatBrl(s.avgTicket)}</div><div class="l">Ticket médio</div></div>
        <div class="kpi"><div class="v">${this.formatBrl(s.deliveryFees)}</div><div class="l">Fretes cobrados</div></div>
      </div>
      <h2>Produtos mais vendidos</h2>
      <table><thead><tr><th>#</th><th>Produto</th><th class="num">Qtd.</th><th class="num">Faturamento</th></tr></thead><tbody>${topRows}</tbody></table>
      <h2>Formas de pagamento</h2>
      <table><thead><tr><th>Forma</th><th class="num">Pedidos</th><th class="num">Total</th></tr></thead><tbody>${payRows}</tbody></table>
      <p class="note">Pedidos cancelados não entram nos totais acima.
        ${s.cancelledOrders ? `No período houve ${s.cancelledOrders} pedido(s) cancelado(s), somando ${this.formatBrl(s.cancelledTotal)}.` : ''}</p>
      <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
    </body></html>`;
  }

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
    this.avgDeliveryTime = Math.round(Number(d.avgDeliveryTime) || 0);

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
