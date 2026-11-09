import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../../core/services/auth.service';

const MIN_LENGTH = 8;

/** RF05 — abre pelo link do e-mail (?token=...) e grava a nova senha. */
@Component({
  selector: 'app-reset-password',
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
            <h2 class="page-title">Criar nova senha</h2>

            @if (!token) {
              <div class="error-box">
                <mat-icon>link_off</mat-icon>
                <p>Link inválido. Peça um novo na tela "Esqueci minha senha".</p>
              </div>
            } @else if (error) {
              <div class="error-box">
                <mat-icon>link_off</mat-icon>
                <p>{{ error }}</p>
                <p class="hint"><a routerLink="/esqueci-senha">Pedir um novo link</a></p>
              </div>
            } @else {
              <form (ngSubmit)="submit()">
                <mat-form-field appearance="outline" class="full-width" floatLabel="always">
                  <mat-label>Nova senha</mat-label>
                  <input matInput [type]="hide ? 'password' : 'text'" [(ngModel)]="password" name="password"
                         required maxlength="128" autocomplete="new-password">
                  <mat-icon matPrefix>lock</mat-icon>
                  <button mat-icon-button matSuffix type="button" (click)="hide = !hide">
                    <mat-icon>{{ hide ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  <mat-hint>Mínimo de {{ minLength }} caracteres</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width" floatLabel="always">
                  <mat-label>Confirmar senha</mat-label>
                  <input matInput [type]="hide ? 'password' : 'text'" [(ngModel)]="confirm" name="confirm"
                         required maxlength="128" autocomplete="new-password">
                  <mat-icon matPrefix>lock</mat-icon>
                </mat-form-field>

                <button mat-raised-button color="primary" type="submit" class="full-width submit-btn"
                        [disabled]="loading || !password || !confirm">
                  @if (loading) { <mat-spinner diameter="20"></mat-spinner> } @else { <span>Salvar nova senha</span> }
                </button>
              </form>
            }

            <div class="forgot-link">
              <a routerLink="/login">Voltar para o login</a>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styleUrls: ['../login/login.component.scss', '../forgot-password/auth-extra.scss'],
})
export class ResetPasswordComponent implements OnInit {
  readonly minLength = MIN_LENGTH;
  token = '';
  password = '';
  confirm = '';
  hide = true;
  loading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  submit(): void {
    if (this.password.length < MIN_LENGTH) {
      this.snack.open(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`, 'OK', { duration: 3500 });
      return;
    }
    if (this.password !== this.confirm) {
      this.snack.open('As senhas não conferem.', 'OK', { duration: 3500 });
      return;
    }
    this.loading = true;
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        this.snack.open(res.message, 'OK', { duration: 5000 });
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 400) {
          this.error = err.error?.message || 'Link inválido ou expirado.';
        } else {
          this.snack.open('Não foi possível salvar agora. Tente de novo.', 'OK', { duration: 4000 });
        }
      },
    });
  }
}
