import { Routes } from '@angular/router';

export const PUBLIC_SHOP_ROUTES: Routes = [
  {
    path: ':slug',
    loadComponent: () =>
      import('./pages/shop/shop.component').then(m => m.ShopComponent)
  }
];
