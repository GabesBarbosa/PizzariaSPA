import { Routes } from '@angular/router';

export const ORDER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/order-list/order-list.component').then(m => m.OrderListComponent)
  },
  {
    path: 'novo',
    loadComponent: () =>
      import('./pages/order-create/order-create.component').then(m => m.OrderCreateComponent)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/order-detail/order-detail.component').then(m => m.OrderDetailComponent)
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/order-create/order-create.component').then(m => m.OrderCreateComponent)
  }
];
