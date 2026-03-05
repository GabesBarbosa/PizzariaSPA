import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CustomerService } from '../../../../core/services/customer.service';

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
  isEditing = false;
  saving = false;
  private customerId?: number;

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', Validators.required],
      email: ['', Validators.email],
      address: ['']
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing = true;
      this.customerId = +id;
      this.customerService.getById(this.customerId).subscribe(customer => {
        this.form.patchValue(customer);
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;

    const data = this.form.value;
    const request$ = this.isEditing
      ? this.customerService.update(this.customerId!, data)
      : this.customerService.create(data);

    request$.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditing ? 'Cliente atualizado!' : 'Cliente cadastrado!',
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/clientes']);
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
