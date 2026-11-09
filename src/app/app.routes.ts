import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then(m => m.LoginComponent)
  },
  // Recuperação de senha (RF05) — públicas, sem o authGuard
  {
    path: 'esqueci-senha',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'redefinir-senha',
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'c',
    loadChildren: () =>
      import('./features/public-shop/public-shop.routes').then(m => m.PUBLIC_SHOP_ROUTES)
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/pages/home/home.component').then(m => m.HomeComponent)
      },
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
      },
      {
        path: 'mensagens',
        loadChildren: () =>
          import('./features/messaging/messaging.routes').then(m => m.MESSAGING_ROUTES)
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/profile/pages/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'entrega',
        loadComponent: () =>
          import('./features/delivery-settings/pages/delivery-settings/delivery-settings.component').then(m => m.DeliverySettingsComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'home' }
];
