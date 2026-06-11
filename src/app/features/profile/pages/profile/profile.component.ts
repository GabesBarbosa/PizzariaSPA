import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';

import { AuthService, AuthUser } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  name = '';
  email = '';
  businessName = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  saving = false;
  savingPassword = false;
  hideCurrentPassword = true;
  hideNewPassword = true;

  user: AuthUser | null = null;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    if (this.user) {
      this.name = this.user.name;
      this.email = this.user.email;
      this.businessName = this.user.businessName || '';
    }
  }

  saveProfile(): void {
    if (!this.name || !this.email || !this.businessName) return;
    this.saving = true;
    this.http.put<any>(`${environment.apiUrl}/auth/profile`, { name: this.name, email: this.email, businessName: this.businessName }).subscribe({
      next: (res) => {
        this.saving = false;
        // Update local session
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.user = res.user;
        (this.authService as any).userSubject.next(res.user);
        this.snackBar.open('Perfil atualizado!', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || 'Erro ao atualizar perfil', 'OK', { duration: 4000 });
      }
    });
  }

  changePassword(): void {
    if (!this.currentPassword || !this.newPassword) return;
    if (this.newPassword !== this.confirmPassword) {
      this.snackBar.open('As senhas não coincidem', 'OK', { duration: 3000 });
      return;
    }
    if (this.newPassword.length < 4) {
      this.snackBar.open('A nova senha deve ter pelo menos 4 caracteres', 'OK', { duration: 3000 });
      return;
    }
    this.savingPassword = true;
    this.http.put<any>(`${environment.apiUrl}/auth/profile`, {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: (res) => {
        this.savingPassword = false;
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.snackBar.open('Senha alterada com sucesso!', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.savingPassword = false;
        this.snackBar.open(err.error?.message || 'Erro ao alterar senha', 'OK', { duration: 4000 });
      }
    });
  }
}
