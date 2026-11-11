import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { NavbarComponent } from './navbar/navbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { NotificationService } from '../core/services/notification.service';

/** Até esta largura o menu vira gaveta sobreposta (celular e tablet em pé). */
const MOBILE_MAX = 900;

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  template: `
    <app-navbar
      [sidenavOpen]="sidenavOpen"
      (menuToggle)="toggleSidenav()">
    </app-navbar>
    <div class="layout-wrapper" [class.mobile]="isMobile">
      <aside class="sidenav" [class.collapsed]="!sidenavOpen">
        <app-sidebar></app-sidebar>
      </aside>
      @if (isMobile && sidenavOpen) {
        <div class="backdrop" (click)="sidenavOpen = false"></div>
      }
      <main class="content">
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
                  transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
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
      min-width: 0;
      padding: 24px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* Celular: menu por cima do conteúdo, que ocupa a tela toda */
    .layout-wrapper.mobile .sidenav {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 20;
      width: 260px;
      min-width: 260px;
      opacity: 1;
      box-shadow: 4px 0 16px rgba(0, 0, 0, 0.2);
    }
    .layout-wrapper.mobile .sidenav.collapsed {
      transform: translateX(-100%);
      box-shadow: none;
    }
    .backdrop {
      position: absolute;
      inset: 0;
      z-index: 10;
      background: rgba(0, 0, 0, 0.4);
    }
    .layout-wrapper.mobile .content {
      padding: 16px 12px;
    }

    @media (max-width: 600px) {
      .layout-wrapper { top: 56px; }
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  isMobile = this.checkMobile();
  sidenavOpen = !this.isMobile;
  private navSub?: Subscription;

  constructor(private notificationService: NotificationService, private router: Router) {}

  ngOnInit(): void {
    this.notificationService.connect();
    // No celular, fecha o menu depois de escolher uma página
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => { if (this.isMobile) this.sidenavOpen = false; });
  }

  ngOnDestroy(): void {
    this.notificationService.disconnect();
    this.navSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    const mobile = this.checkMobile();
    if (mobile !== this.isMobile) {
      this.isMobile = mobile;
      this.sidenavOpen = !mobile;
    }
  }

  toggleSidenav(): void {
    this.sidenavOpen = !this.sidenavOpen;
  }

  private checkMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= MOBILE_MAX;
  }
}
