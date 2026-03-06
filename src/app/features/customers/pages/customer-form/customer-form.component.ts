import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CustomerService } from '../../../../core/services/customer.service';

function brPhoneValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const digits = control.value.replace(/\D/g, '');
  // Celular: 2 DDD + 9 dígitos = 11 | Fixo: 2 DDD + 8 dígitos = 10
  if (digits.length < 10 || digits.length > 11) return { invalidPhone: true };
  // DDD válido: 11-99
  const ddd = parseInt(digits.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return { invalidPhone: true };
  // Celular deve começar com 9
  if (digits.length === 11 && digits[2] !== '9') return { invalidPhone: true };
  return null;
}

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule
  ],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.scss'
})
export class CustomerFormComponent implements OnInit {
  form!: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, brPhoneValidator]],
      address: ['']
    });
  }

  formatPhone(): void {
    const ctrl = this.form.get('phone')!;
    let digits = (ctrl.value || '').replace(/\D/g, '');
    if (digits.length > 11) digits = digits.substring(0, 11);
    if (digits.length > 6) {
      ctrl.setValue(`(${digits.substring(0, 2)}) ${digits.substring(2, digits.length - 4)}-${digits.substring(digits.length - 4)}`, { emitEvent: false });
    } else if (digits.length > 2) {
      ctrl.setValue(`(${digits.substring(0, 2)}) ${digits.substring(2)}`, { emitEvent: false });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;

    this.customerService.create(this.form.value).subscribe({
      next: () => {
        this.snackBar.open('Cliente cadastrado!', 'OK', { duration: 3000 });
        this.router.navigate(['/clientes']);
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
