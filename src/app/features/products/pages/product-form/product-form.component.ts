import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ProductService } from '../../../../core/services/product.service';
import { CurrencyMaskDirective } from '../../../../shared/utils/currency-mask.directive';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatSnackBarModule,
    CurrencyMaskDirective
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})
export class ProductFormComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  isEditMode = false;
  productId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      category: ['pizza', Validators.required],
      price: [null, [Validators.required, Validators.min(0.01)]],
      description: ['']
    });

    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.isEditMode = true;
      this.productService.getById(this.productId).subscribe({
        next: (product) => {
          this.form.patchValue({
            name: product.name,
            category: product.category,
            price: product.price,
            description: product.description || ''
          });
        },
        error: () => {
          this.snackBar.open('Erro ao carregar produto', 'OK', { duration: 3000 });
          this.router.navigate(['/produtos']);
        }
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;

    const obs = this.isEditMode
      ? this.productService.update(this.productId!, this.form.value)
      : this.productService.create(this.form.value);

    obs.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditMode ? 'Produto atualizado!' : 'Produto cadastrado!',
          'OK', { duration: 3000 }
        );
        this.router.navigate(['/produtos']);
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
