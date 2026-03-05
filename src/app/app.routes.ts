import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'clientes',
        loadChildren: () =>
          import('./features/customers/customers.routes').then(m => m.CUSTOMER_ROUTES)
      },
      {
        path: 'pedidos',
        loadChildren: () =>
          import('./features/orders/orders.routes').then(m => m.ORDER_ROUTES)
      },
      {
        path: 'produtos',
        loadChildren: () =>
          import('./features/products/products.routes').then(m => m.PRODUCT_ROUTES)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
