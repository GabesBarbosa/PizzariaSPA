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
    const email = this.loginEmail.trim().toLowerCase();
    const password = this.loginPassword;

    if (!email || !password) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.snackBar.open('E-mail inválido', 'OK', { duration: 3000 });
      return;
    }

    this.loginLoading = true;
    this.authService.login(email, password).subscribe({
      next: () => {
        this.loginLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loginLoading = false;
        this.snackBar.open('E-mail ou senha incorretos', 'OK', { duration: 4000 });
      }
    });
  }

  onRegister(name: string, email: string, password: string, businessName: string): void {
    if (!name.trim() || !email.trim() || !password.trim() || !businessName.trim()) {
      this.snackBar.open('Preencha todos os campos', 'OK', { duration: 3000 });
      return;
    }
    this.regLoading = true;
    this.authService.register({
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
      businessName: businessName.trim()
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

}
