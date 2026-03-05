import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary" class="navbar">
      <button mat-icon-button (click)="toggleSidebar()">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="brand">🍕 Pizzaria</span>
      <span class="spacer"></span>
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
  `]
})
export class NavbarComponent {
  onToggle?: () => void;

  toggleSidebar(): void {
    this.onToggle?.();
  }
}
