import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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

import { Customer, Product, CreateOrderDto, PaymentMethod } from '../../../../shared/models';
import { CustomerService } from '../../../../core/services/customer.service';
import { ProductService } from '../../../../core/services/product.service';
import { OrderService } from '../../../../core/services/order.service';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';
import { CurrencyMaskDirective } from '../../../../shared/utils/currency-mask.directive';

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
    MatStepperModule, MatSnackBarModule, BrlPipe,
    CurrencyMaskDirective
  ],
  templateUrl: './order-create.component.html',
  styleUrl: './order-create.component.scss'
})
export class OrderCreateComponent implements OnInit {
  customerForm!: FormGroup;
  newCustomerForm!: FormGroup;
  showNewCustomerForm = false;
  savingCustomer = false;
  searchPerformed = false;
  filteredCustomers: Customer[] = [];
  selectedCustomer?: Customer;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  productSearchText = '';
  selectedProduct?: Product;
  selectedQuantity = 1;
  cart: CartItem[] = [];
  cartColumns = ['product', 'unitPrice', 'quantity', 'subtotal', 'actions'];
  orderNotes = '';
  paymentMethod: PaymentMethod | '' = '';
  deliveryAddress = '';
  deliveryFee: number | null = null;
  submitting = false;

  isEditMode = false;
  orderId?: number;
  loadingOrder = false;

  paymentMethods = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'cartao_credito', label: 'Cartão de Crédito' },
    { value: 'cartao_debito', label: 'Cartão de Débito' },
    { value: 'pix', label: 'PIX' }
  ];

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

    this.newCustomerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, this.brPhoneValidator]],
      address: ['']
    });

    this.customerForm.get('search')!.valueChanges.pipe(
      debounceTime(300),
      switchMap(value => {
        if (typeof value === 'string' && value.length >= 2) {
          this.searchPerformed = true;
          return this.customerService.search(value);
        }
        this.searchPerformed = false;
        return of([]);
      })
    ).subscribe(customers => {
      this.filteredCustomers = customers;
    });

    this.productService.getAll().subscribe({
      next: (products) => {
        this.products = products;
        this.filteredProducts = products;
        this.checkLoadOrder();
      },
      error: () => {
        this.products = [];
        this.filteredProducts = [];
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.orderId = Number(id);
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
        this.paymentMethod = (order.paymentMethod as PaymentMethod) || '';
        this.deliveryAddress = order.deliveryAddress || '';
        this.deliveryFee = order.deliveryFee ?? null;

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
    this.showNewCustomerForm = false;
    if (customer.address) {
      this.deliveryAddress = customer.address;
    }
  }

  toggleNewCustomerForm(): void {
    this.showNewCustomerForm = !this.showNewCustomerForm;
    if (this.showNewCustomerForm) {
      this.newCustomerForm.reset();
      // Pre-fill name from search text
      const searchVal = this.customerForm.get('search')!.value;
      if (typeof searchVal === 'string' && searchVal.length >= 2) {
        this.newCustomerForm.get('name')!.setValue(searchVal);
      }
    }
  }

  formatNewCustomerPhone(): void {
    const ctrl = this.newCustomerForm.get('phone')!;
    let digits = (ctrl.value || '').replace(/\D/g, '');
    if (digits.length > 11) digits = digits.substring(0, 11);
    if (digits.length > 6) {
      ctrl.setValue(`(${digits.substring(0, 2)}) ${digits.substring(2, digits.length - 4)}-${digits.substring(digits.length - 4)}`, { emitEvent: false });
    } else if (digits.length > 2) {
      ctrl.setValue(`(${digits.substring(0, 2)}) ${digits.substring(2)}`, { emitEvent: false });
    }
  }

  saveNewCustomer(): void {
    if (this.newCustomerForm.invalid) return;
    this.savingCustomer = true;

    this.customerService.create(this.newCustomerForm.value).subscribe({
      next: (customer) => {
        this.selectedCustomer = customer;
        this.customerForm.get('search')!.setValue(customer, { emitEvent: false });
        this.showNewCustomerForm = false;
        this.savingCustomer = false;
        if (customer.address) {
          this.deliveryAddress = customer.address;
        }
        this.snackBar.open('Cliente cadastrado!', 'OK', { duration: 2500 });
      },
      error: () => {
        this.savingCustomer = false;
        this.snackBar.open('Erro ao cadastrar cliente', 'OK', { duration: 3000 });
      }
    });
  }

  private brPhoneValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const digits = control.value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) return { invalidPhone: true };
    const ddd = parseInt(digits.substring(0, 2), 10);
    if (ddd < 11 || ddd > 99) return { invalidPhone: true };
    if (digits.length === 11 && digits[2] !== '9') return { invalidPhone: true };
    return null;
  }

  filterProducts(): void {
    const text = this.productSearchText.toLowerCase().trim();
    if (!text) {
      this.filteredProducts = this.products;
    } else {
      this.filteredProducts = this.products.filter(p =>
        p.name.toLowerCase().includes(text) ||
        (p.category && p.category.toLowerCase().includes(text))
      );
    }
  }

  displayProduct(product: Product): string {
    return product ? `${product.name} (${product.category})` : '';
  }

  selectProduct(product: Product): void {
    this.selectedProduct = product;
  }

  addToCart(): void {
    if (!this.selectedProduct) return;
    const product = this.selectedProduct;

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
    this.selectedProduct = undefined;
    this.productSearchText = '';
    this.filteredProducts = this.products;
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

  get subtotal(): number {
    return this.cart.reduce((sum, item) => sum + item.subtotal, 0);
  }

  get orderTotal(): number {
    return this.subtotal + (this.deliveryFee || 0);
  }

  getPaymentLabel(value: string): string {
    return this.paymentMethods.find(p => p.value === value)?.label || value;
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
      paymentMethod: this.paymentMethod || undefined,
      deliveryAddress: this.deliveryAddress || undefined,
      notes: this.orderNotes || undefined,
      deliveryFee: this.deliveryFee || undefined
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
