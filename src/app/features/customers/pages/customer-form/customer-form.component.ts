import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
  if (digits.length < 10 || digits.length > 11) return { invalidPhone: true };
  const ddd = parseInt(digits.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return { invalidPhone: true };
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
  isEditMode = false;
  customerId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, brPhoneValidator]],
      address: ['']
    });

    this.customerId = this.route.snapshot.paramMap.get('id');
    if (this.customerId) {
      this.isEditMode = true;
      this.customerService.getById(this.customerId).subscribe({
        next: (customer) => {
          this.form.patchValue({
            name: customer.name,
            phone: customer.phone,
            address: customer.address || ''
          });
        },
        error: () => {
          this.snackBar.open('Erro ao carregar cliente', 'OK', { duration: 3000 });
          this.router.navigate(['/clientes']);
        }
      });
    }
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

    const obs = this.isEditMode
      ? this.customerService.update(this.customerId!, this.form.value)
      : this.customerService.create(this.form.value);

    obs.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditMode ? 'Cliente atualizado!' : 'Cliente cadastrado!',
          'OK', { duration: 3000 }
        );
        this.router.navigate(['/clientes']);
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
