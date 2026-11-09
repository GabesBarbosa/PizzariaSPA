import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../../core/services/auth.service';

/** RF05 — "Esqueci minha senha": pede o e-mail e dispara o link de redefinição. */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="login-page">
      <div class="login-container">
        <div class="logo-section">
          <img src="assets/dashfoodSEMfundo.png" alt="dashfood logo" class="logo-img">
          <p>Sistema de gestão de pedidos</p>
        </div>

        <mat-card>
          <div class="tab-content">
            <h2 class="page-title">Esqueci minha senha</h2>

            @if (!sent) {
              <p class="page-text">Informe o e-mail cadastrado. Vamos enviar um link para você criar uma nova senha.</p>
              <form (ngSubmit)="submit()">
                <mat-form-field appearance="outline" class="full-width" floatLabel="always">
                  <mat-label>E-mail</mat-label>
                  <input matInput type="email" [(ngModel)]="email" name="email"
                         placeholder="seu@email.com" required maxlength="200" autocomplete="email">
                  <mat-icon matPrefix>email</mat-icon>
                </mat-form-field>

                <button mat-raised-button color="primary" type="submit" class="full-width submit-btn"
                        [disabled]="loading || !email">
                  @if (loading) { <mat-spinner diameter="20"></mat-spinner> } @else { <span>Enviar link</span> }
                </button>
              </form>
            } @else {
              <div class="sent-box">
                <mat-icon>mark_email_read</mat-icon>
                <p>{{ message }}</p>
                <p class="hint">O link vale por 30 minutos. Confira também a caixa de spam.</p>
              </div>
            }

            <div class="forgot-link">
              <a routerLink="/login">Voltar para o login</a>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styleUrls: ['../login/login.component.scss', './auth-extra.scss'],
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  sent = false;
  message = '';

  constructor(private auth: AuthService, private snack: MatSnackBar) {}

  submit(): void {
    const email = this.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.snack.open('E-mail inválido', 'OK', { duration: 3000 });
      return;
    }
    this.loading = true;
    this.auth.forgotPassword(email).subscribe({
      next: (res) => {
        this.loading = false;
        this.sent = true;
        this.message = res.message;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Não foi possível enviar agora. Tente de novo em instantes.', 'OK', { duration: 4000 });
      },
    });
  }
}
