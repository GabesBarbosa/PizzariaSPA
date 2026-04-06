import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, MatToolbarModule, MatIconModule, MatButtonModule, MatMenuModule],
  template: `
    <mat-toolbar color="primary" class="navbar">
      <button mat-icon-button (click)="menuToggle.emit()" class="menu-btn">
        <mat-icon class="menu-icon" [class.open]="sidenavOpen">menu</mat-icon>
      </button>
      <span class="brand">Comanda</span>
      <span class="spacer"></span>
      <button mat-icon-button [matMenuTriggerFor]="userMenu">
        <mat-icon>account_circle</mat-icon>
      </button>
      <mat-menu #userMenu="matMenu">
        <div class="user-info" *ngIf="authService.currentUser">
          <strong>{{ authService.currentUser.name }}</strong>
          <small>{{ authService.currentUser.email }}</small>
        </div>
        <button mat-menu-item routerLink="/perfil">
          <mat-icon>settings</mat-icon>
          <span>Meu Perfil</span>
        </button>
        <button mat-menu-item (click)="authService.logout()">
          <mat-icon>logout</mat-icon>
          <span>Sair</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
    }
    .brand {
      margin-left: 8px;
      font-size: 1.2rem;
      font-weight: 500;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .menu-btn {
      transition: transform 0.2s ease;
    }
    .menu-btn:active {
      transform: scale(0.9);
    }
    .menu-icon {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .menu-icon.open {
      transform: rotate(180deg);
    }
    .user-info {
      padding: 8px 16px;
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      margin-bottom: 4px;

      strong { font-size: 0.95rem; }
      small { color: rgba(0,0,0,0.54); font-size: 0.8rem; }
    }
  `]
})
export class NavbarComponent {
  @Input() sidenavOpen = true;
  @Output() menuToggle = new EventEmitter<void>();

  get tenantName(): string {
    return this.authService.currentUser?.tenantName || 'Pizzaria';
  }

  constructor(public authService: AuthService) {}
}
