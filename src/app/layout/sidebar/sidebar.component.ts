import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatListModule, MatIconModule],
  template: `
    <mat-nav-list>
      <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link">
        <mat-icon matListItemIcon>dashboard</mat-icon>
        <span matListItemTitle>Dashboard</span>
      </a>
      <a mat-list-item routerLink="/pedidos" routerLinkActive="active-link">
        <mat-icon matListItemIcon>receipt_long</mat-icon>
        <span matListItemTitle>Pedidos</span>
      </a>
      <a mat-list-item routerLink="/clientes" routerLinkActive="active-link">
        <mat-icon matListItemIcon>people</mat-icon>
        <span matListItemTitle>Clientes</span>
      </a>
      <a mat-list-item routerLink="/produtos" routerLinkActive="active-link">
        <mat-icon matListItemIcon>local_pizza</mat-icon>
        <span matListItemTitle>Produtos</span>
      </a>
      <a mat-list-item routerLink="/mensagens" routerLinkActive="active-link">
        <mat-icon matListItemIcon>chat</mat-icon>
        <span matListItemTitle>WhatsApp</span>
      </a>
    </mat-nav-list>
  `,
  styles: [`
    .active-link {
      background-color: rgba(0, 0, 0, 0.08);
    }
  `]
})
export class SidebarComponent {}
