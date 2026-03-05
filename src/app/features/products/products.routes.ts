import { Routes } from '@angular/router';

export const PRODUCT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/product-list/product-list.component').then(m => m.ProductListComponent)
  },
  {
    path: 'novo',
    loadComponent: () =>
      import('./pages/product-form/product-form.component').then(m => m.ProductFormComponent)
  }
];
