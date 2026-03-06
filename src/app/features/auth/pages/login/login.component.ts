import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatTabsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  // Login
  loginEmail = '';
  loginPassword = '';
  loginLoading = false;
  hideLoginPassword = true;

  // Register
  regName = '';
  regEmail = '';
  regPassword = '';
  regTenantName = '';
  regTenantSlug = '';
  regLoading = false;
  hideRegPassword = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/dashboard']);
    }
  }

  onLogin(): void {
    if (!this.loginEmail || !this.loginPassword) return;
    this.loginLoading = true;
    this.authService.login(this.loginEmail, this.loginPassword).subscribe({
      next: () => {
        this.loginLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loginLoading = false;
        this.snackBar.open(err.error?.message || 'Erro ao fazer login', 'OK', { duration: 4000 });
      }
    });
  }

  onRegister(): void {
    if (!this.regName || !this.regEmail || !this.regPassword || !this.regTenantName || !this.regTenantSlug) return;
    this.regLoading = true;
    this.authService.register({
      name: this.regName,
      email: this.regEmail,
      password: this.regPassword,
      tenantName: this.regTenantName,
      tenantSlug: this.regTenantSlug
    }).subscribe({
      next: () => {
        this.regLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.regLoading = false;
        this.snackBar.open(err.error?.message || 'Erro ao registrar', 'OK', { duration: 4000 });
      }
    });
  }

  generateSlug(): void {
    this.regTenantSlug = this.regTenantName
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
