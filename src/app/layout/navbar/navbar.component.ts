import { Component, Output, EventEmitter, Input } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary" class="navbar">
      <button mat-icon-button (click)="menuToggle.emit()" class="menu-btn">
        <mat-icon class="menu-icon" [class.open]="sidenavOpen">menu</mat-icon>
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
  `]
})
export class NavbarComponent {
  @Input() sidenavOpen = true;
  @Output() menuToggle = new EventEmitter<void>();
}
