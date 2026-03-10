import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { NotificationService } from '../core/services/notification.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  template: `
    <app-navbar
      [sidenavOpen]="sidenavOpen"
      (menuToggle)="toggleSidenav()">
    </app-navbar>
    <div class="layout-wrapper">
      <aside class="sidenav" [class.collapsed]="!sidenavOpen">
        <app-sidebar></app-sidebar>
      </aside>
      <main class="content" [class.expanded]="!sidenavOpen">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout-wrapper {
      position: fixed;
      top: 64px;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      overflow: hidden;
    }
    .sidenav {
      width: 240px;
      min-width: 240px;
      background: #fff;
      border-right: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
      overflow-x: hidden;
      overflow-y: auto;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  box-shadow 0.3s ease,
                  opacity 0.3s ease;
    }
    .sidenav.collapsed {
      width: 0;
      min-width: 0;
      box-shadow: none;
      border-right: none;
      opacity: 0;
    }
    .content {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidenavOpen = true;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.connect();
  }

  ngOnDestroy(): void {
    this.notificationService.disconnect();
  }

  toggleSidenav(): void {
    this.sidenavOpen = !this.sidenavOpen;
  }
}
