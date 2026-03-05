import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime, switchMap, of } from 'rxjs';

import { Customer, Product, CreateOrderDto } from '../../../../shared/models';
import { CustomerService } from '../../../../core/services/customer.service';
import { ProductService } from '../../../../core/services/product.service';
import { OrderService } from '../../../../core/services/order.service';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

@Component({
  selector: 'app-order-create',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatAutocompleteModule,
    MatSelectModule, MatTableModule, MatDividerModule,
    MatStepperModule, MatSnackBarModule, BrlPipe
  ],
  templateUrl: './order-create.component.html',
  styleUrl: './order-create.component.scss'
})
export class OrderCreateComponent implements OnInit {
  customerForm!: FormGroup;
  filteredCustomers: Customer[] = [];
  selectedCustomer?: Customer;
  products: Product[] = [];
  selectedProductId?: string;
  selectedQuantity = 1;
  cart: CartItem[] = [];
  cartColumns = ['product', 'unitPrice', 'quantity', 'subtotal', 'actions'];
  orderNotes = '';
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private productService: ProductService,
    private orderService: OrderService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.customerForm = this.fb.group({
      search: ['', Validators.required]
    });

    this.customerForm.get('search')!.valueChanges.pipe(
      debounceTime(300),
      switchMap(value => {
        if (typeof value === 'string' && value.length >= 2) {
          return this.customerService.search(value);
        }
        return of([]);
      })
    ).subscribe(customers => {
      this.filteredCustomers = customers;
    });

    this.productService.getAll().subscribe({
      next: (products) => {
        this.products = products;
      },
      error: () => {
        this.products = [];
      }
    });
  }

  displayCustomer(customer: Customer): string {
    return customer ? `${customer.name} - ${customer.phone}` : '';
  }

  selectCustomer(customer: Customer): void {
    this.selectedCustomer = customer;
  }

  addToCart(): void {
    const product = this.products.find(p => p.id === this.selectedProductId);
    if (!product) return;

    const existingIndex = this.cart.findIndex(i => i.product.id === product.id);
    if (existingIndex >= 0) {
      this.cart[existingIndex].quantity += this.selectedQuantity;
      this.cart[existingIndex].subtotal = this.cart[existingIndex].quantity * product.price;
    } else {
      this.cart.push({
        product,
        quantity: this.selectedQuantity,
        subtotal: this.selectedQuantity * product.price
      });
    }

    this.cart = [...this.cart]; // trigger table update
    this.selectedProductId = undefined;
    this.selectedQuantity = 1;
  }

  removeFromCart(index: number): void {
    this.cart.splice(index, 1);
    this.cart = [...this.cart];
  }

  get orderTotal(): number {
    return this.cart.reduce((sum, item) => sum + item.subtotal, 0);
  }

  submitOrder(): void {
    if (!this.selectedCustomer || this.cart.length === 0) return;

    this.submitting = true;

    const order: CreateOrderDto = {
      customerId: this.selectedCustomer.id,
      items: this.cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      })),
      notes: this.orderNotes || undefined
    };

    this.orderService.create(order).subscribe({
      next: (created) => {
        this.snackBar.open(`Pedido criado com sucesso!`, 'OK', { duration: 3000 });
        this.router.navigate(['/pedidos', created.id], { state: { order: created } });
      },
      error: () => {
        this.submitting = false;
      }
    });
  }
}
