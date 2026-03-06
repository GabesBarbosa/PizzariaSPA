import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime, switchMap, of, forkJoin } from 'rxjs';

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

  isEditMode = false;
  orderId?: string;
  loadingOrder = false;

  @ViewChild('stepper') stepper!: MatStepper;

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private productService: ProductService,
    private orderService: OrderService,
    private router: Router,
    private route: ActivatedRoute,
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
        this.checkLoadOrder();
      },
      error: () => {
        this.products = [];
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.orderId = id;
    }
  }

  private checkLoadOrder(): void {
    if (!this.isEditMode || !this.orderId || this.products.length === 0) return;

    this.loadingOrder = true;
    this.orderService.getById(this.orderId).subscribe({
      next: (order) => {
        // Populate cart from order items
        this.cart = order.items.map(item => {
          const product = this.products.find(p => p.id === item.productId);
          return {
            product: product || { id: item.productId, name: item.productName || 'Produto', price: item.price || 0 } as Product,
            quantity: item.quantity,
            subtotal: item.quantity * (product?.price ?? item.price ?? 0)
          };
        });

        this.orderNotes = order.notes || '';

        // Load the customer, then advance stepper to products step
        this.customerService.getById(order.customerId).subscribe({
          next: (customer) => {
            this.selectedCustomer = customer;
            this.customerForm.get('search')!.setValue(customer, { emitEvent: false });
            this.loadingOrder = false;

            // Jump to products step after data is loaded
            setTimeout(() => {
              if (this.stepper) {
                this.stepper.selectedIndex = 1;
              }
            });
          },
          error: () => {
            this.loadingOrder = false;
          }
        });
      },
      error: () => {
        this.snackBar.open('Erro ao carregar pedido', 'OK', { duration: 3000 });
        this.loadingOrder = false;
        this.router.navigate(['/pedidos']);
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

  increaseQty(index: number): void {
    this.cart[index].quantity++;
    this.cart[index].subtotal = this.cart[index].quantity * this.cart[index].product.price;
    this.cart = [...this.cart];
  }

  decreaseQty(index: number): void {
    if (this.cart[index].quantity <= 1) return;
    this.cart[index].quantity--;
    this.cart[index].subtotal = this.cart[index].quantity * this.cart[index].product.price;
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

    const request$ = this.isEditMode && this.orderId
      ? this.orderService.update(this.orderId, order)
      : this.orderService.create(order);

    request$.subscribe({
      next: () => {
        const msg = this.isEditMode ? 'Pedido atualizado com sucesso!' : 'Pedido criado com sucesso!';
        this.snackBar.open(msg, 'OK', { duration: 3000 });
        this.router.navigate(['/pedidos']);
      },
      error: () => {
        this.submitting = false;
      }
    });
  }
}
