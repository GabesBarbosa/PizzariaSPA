import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, switchMap, of } from 'rxjs';

import { Customer, Product, ProductVariation, CreateOrderDto, PaymentMethod, DeliveryType } from '../../../../shared/models';
import { CustomerService } from '../../../../core/services/customer.service';
import { ProductService } from '../../../../core/services/product.service';
import { OrderService } from '../../../../core/services/order.service';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';
import { PhonePipe } from '../../../../shared/utils/phone.pipe';
import { CurrencyMaskDirective } from '../../../../shared/utils/currency-mask.directive';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  selectedVariations: ProductVariation[];
}

@Component({
  selector: 'app-order-create',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatAutocompleteModule,
    MatSelectModule, MatTableModule, MatDividerModule,
    MatStepperModule, MatSnackBarModule, MatChipsModule,
    MatCheckboxModule, MatProgressSpinnerModule,
    BrlPipe, PhonePipe, CurrencyMaskDirective
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
  categories: string[] = [];
  selectedCategory = '';
  productSearchText = '';
  selectedProduct?: Product;
  selectedQuantity = 1;
  productVariations: ProductVariation[] = [];
  selectedVariationIds: Set<string> = new Set();
  loadingVariations = false;
  cart: CartItem[] = [];
  cartColumns = ['product', 'unitPrice', 'quantity', 'subtotal', 'actions'];
  orderNotes = '';
  paymentMethod: PaymentMethod | '' = '';
  deliveryType: DeliveryType = 'delivery';
  deliveryAddress = '';
  deliveryFee: number | null = null;
  shippingLoading = false;
  shippingError: string | null = null;
  cepLookingUp = false;
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
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.customerForm = this.fb.group({
      search: ['', Validators.required]
    });

    this.newCustomerForm = this.fb.group({
      name:         ['', [Validators.required, Validators.minLength(3)]],
      phone:        ['', [Validators.required, this.brPhoneValidator]],
      cep:          [''],
      number:       [''],
      address:      [''],
      street:       [''],
      complement:   [''],
      neighborhood: [''],
      city:         [''],
      uf:           [''],
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
        this.categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
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
        this.cart = order.items.map(item => {
          const product = this.products.find(p => p.id === item.productId)
            || { id: item.productId, name: item.productName || 'Produto', price: item.unitPrice || item.price || 0 } as Product;
          const unitPrice = item.unitPrice || item.price || product.price;
          const selectedVariations: ProductVariation[] = (item.variations || []).map(v => ({
            id: v.variationId,
            productId: item.productId,
            name: v.variationName || v.name || '',
            type: (v.variationType || 'custom') as ProductVariation['type'],
            priceModifier: v.priceModifier
          }));
          return {
            product,
            quantity: item.quantity,
            unitPrice,
            subtotal: item.quantity * unitPrice,
            selectedVariations
          };
        });

        this.orderNotes = order.notes || '';
        this.paymentMethod = (order.paymentMethod as PaymentMethod) || '';
        this.deliveryAddress = order.deliveryAddress || '';
        this.deliveryFee = order.deliveryFee ?? null;

        this.customerService.getById(order.customerId).subscribe({
          next: (customer) => {
            this.selectedCustomer = customer;
            this.customerForm.get('search')!.setValue(customer, { emitEvent: false });
            this.loadingOrder = false;
            setTimeout(() => {
              if (this.stepper) this.stepper.selectedIndex = 1;
            });
          },
          error: () => { this.loadingOrder = false; }
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

  setDeliveryType(type: DeliveryType): void {
    this.deliveryType = type;
    if (type === 'pickup') {
      this.deliveryAddress = '';
      this.deliveryFee = 0;
      this.shippingError = null;
    } else {
      this.deliveryFee = null;
      if (this.selectedCustomer?.address) {
        this.deliveryAddress = this.selectedCustomer.address;
      }
      if (this.selectedCustomer?.cep && this.selectedCustomer?.number) {
        this.quoteShipping(this.selectedCustomer);
      }
    }
  }

  selectCustomer(customer: Customer): void {
    this.selectedCustomer = customer;
    this.showNewCustomerForm = false;
    this.shippingError = null;

    if (this.deliveryType === 'delivery') {
      if (customer.address) {
        this.deliveryAddress = customer.address;
      }
      if (customer.cep && customer.number) {
        this.quoteShipping(customer);
      }
    }
  }

  private quoteShipping(customer: Customer): void {
    const slug = this.authService.currentUser?.businessSlug;
    if (!slug) return;

    this.shippingLoading = true;
    this.deliveryFee = null;
    this.shippingError = null;

    this.http.post<{ fee: number; distanceKm: number; outOfRange: boolean }>(
      `${environment.apiUrl.replace('/api', '')}/api/public/${slug}/shipping`,
      {
        cep: customer.cep,
        number: customer.number,
        street: customer.street,
        neighborhood: customer.neighborhood,
        city: customer.city,
        uf: customer.uf,
      }
    ).subscribe({
      next: (res) => {
        this.shippingLoading = false;
        if (res.outOfRange) {
          this.shippingError = `Fora da área de entrega (${res.distanceKm} km). Informe a taxa manualmente.`;
        } else {
          this.deliveryFee = res.fee;
          this.shippingError = null;
        }
      },
      error: (err) => {
        this.shippingLoading = false;
        this.shippingError = err?.error?.message || 'Não foi possível calcular o frete.';
      },
    });
  }

  toggleNewCustomerForm(): void {
    this.showNewCustomerForm = !this.showNewCustomerForm;
    if (this.showNewCustomerForm) {
      this.newCustomerForm.reset();
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

  formatNewCep(): void {
    const ctrl = this.newCustomerForm.get('cep')!;
    let digits = (ctrl.value || '').replace(/\D/g, '').slice(0, 8);
    const out = digits.length > 5 ? `${digits.substring(0, 5)}-${digits.substring(5)}` : digits;
    ctrl.setValue(out, { emitEvent: false });
  }

  onNewCepBlur(): void {
    const cep = (this.newCustomerForm.value.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    this.cepLookingUp = true;
    this.http.get<any>(`${environment.apiUrl}/public/cep/${cep}`).subscribe({
      next: (info) => {
        const number = this.newCustomerForm.value.number || '';
        const formatted = [info.street, number].filter(Boolean).join(', ')
          + (info.neighborhood ? ` - ${info.neighborhood}` : '')
          + (info.city && info.uf ? `, ${info.city}/${info.uf}` : '');
        this.newCustomerForm.patchValue({
          street: info.street,
          neighborhood: info.neighborhood,
          city: info.city,
          uf: info.uf,
          address: formatted,
        });
        this.cepLookingUp = false;
      },
      error: () => {
        this.cepLookingUp = false;
        this.snackBar.open('CEP não encontrado.', 'OK', { duration: 3000 });
      },
    });
  }

  saveNewCustomer(): void {
    if (this.newCustomerForm.invalid) return;
    this.savingCustomer = true;

    const v = this.newCustomerForm.value;

    this.customerService.create({
      name: v.name,
      phone: v.phone,
      address: v.address || undefined,
      cep: v.cep || undefined,
      number: v.number || undefined,
      street: v.street || undefined,
      complement: v.complement || undefined,
      neighborhood: v.neighborhood || undefined,
      city: v.city || undefined,
      uf: v.uf || undefined,
    }).subscribe({
      next: (customer) => {
        this.selectedCustomer = customer;
        this.customerForm.get('search')!.setValue(customer, { emitEvent: false });
        this.showNewCustomerForm = false;
        this.savingCustomer = false;
        if (this.deliveryType === 'delivery') {
          if (customer.address) this.deliveryAddress = customer.address;
          if (customer.cep && customer.number) this.quoteShipping(customer);
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

  selectCategory(category: string): void {
    this.selectedCategory = this.selectedCategory === category ? '' : category;
    this.filterProducts();
  }

  filterProducts(): void {
    let result = this.products;
    if (this.selectedCategory) {
      result = result.filter(p => p.category === this.selectedCategory);
    }
    const text = this.productSearchText.toLowerCase().trim();
    if (text) {
      result = result.filter(p => p.name.toLowerCase().includes(text));
    }
    this.filteredProducts = result;
  }

  /** Recarrega o catálogo para refletir o estoque atual. */
  private reloadProducts(): void {
    this.productService.getAll().subscribe({
      next: (products) => {
        this.products = products;
        this.filterProducts();
      },
      error: () => {}
    });
  }

  /** Produto com estoque zerado: bloqueado no seletor do pedido. */
  isOutOfStock(product: Product): boolean {
    return product.stockQuantity !== null
      && product.stockQuantity !== undefined
      && product.stockQuantity <= 0;
  }

  getStockLabel(product: Product): string | null {
    if (product.stockQuantity === null || product.stockQuantity === undefined) return null;
    return product.stockQuantity <= 0 ? 'Esgotado' : `${product.stockQuantity} em estoque`;
  }

  selectProduct(product: Product): void {
    if (this.isOutOfStock(product)) {
      this.snackBar.open(`${product.name} está esgotado.`, 'OK', { duration: 3000 });
      return;
    }
    this.selectedProduct = product;
    this.selectedVariationIds = new Set();
    this.productVariations = [];
    this.loadingVariations = true;
    this.productService.getVariations(product.id).subscribe({
      next: (vars) => {
        this.productVariations = vars;
        this.loadingVariations = false;
      },
      error: () => { this.loadingVariations = false; }
    });
  }

  toggleVariation(variation: ProductVariation): void {
    if (this.selectedVariationIds.has(variation.id)) {
      this.selectedVariationIds.delete(variation.id);
    } else {
      this.selectedVariationIds.add(variation.id);
    }
    this.selectedVariationIds = new Set(this.selectedVariationIds);
  }

  isVariationSelected(variation: ProductVariation): boolean {
    return this.selectedVariationIds.has(variation.id);
  }

  get selectedVariations(): ProductVariation[] {
    return this.productVariations.filter(v => this.selectedVariationIds.has(v.id));
  }

  calcCurrentPrice(): number {
    if (!this.selectedProduct) return 0;
    const base = this.selectedProduct.price;
    const modifiers = this.selectedVariations.reduce((sum, v) => sum + v.priceModifier, 0);
    return base + modifiers;
  }

  addToCart(): void {
    if (!this.selectedProduct) return;
    const product = this.selectedProduct;
    const variations = this.selectedVariations;
    const unitPrice = this.calcCurrentPrice();

    const existingIndex = variations.length === 0
      ? this.cart.findIndex(i => i.product.id === product.id && i.selectedVariations.length === 0)
      : -1;

    if (existingIndex >= 0) {
      this.cart[existingIndex].quantity += this.selectedQuantity;
      this.cart[existingIndex].subtotal = this.cart[existingIndex].quantity * unitPrice;
    } else {
      this.cart.push({
        product,
        quantity: this.selectedQuantity,
        unitPrice,
        subtotal: this.selectedQuantity * unitPrice,
        selectedVariations: [...variations]
      });
    }

    this.cart = [...this.cart];
    this.selectedProduct = undefined;
    this.productVariations = [];
    this.selectedVariationIds = new Set();
    this.productSearchText = '';
    this.selectedQuantity = 1;
    this.filterProducts();
  }

  removeFromCart(index: number): void {
    this.cart.splice(index, 1);
    this.cart = [...this.cart];
  }

  increaseQty(index: number): void {
    const item = this.cart[index];
    item.quantity++;
    item.subtotal = item.quantity * item.unitPrice;
    this.cart = [...this.cart];
  }

  decreaseQty(index: number): void {
    if (this.cart[index].quantity <= 1) return;
    const item = this.cart[index];
    item.quantity--;
    item.subtotal = item.quantity * item.unitPrice;
    this.cart = [...this.cart];
  }

  get subtotal(): number {
    return this.cart.reduce((sum, item) => sum + item.subtotal, 0);
  }

  get orderTotal(): number {
    return this.subtotal + (this.deliveryType === 'delivery' ? (this.deliveryFee || 0) : 0);
  }

  getPaymentLabel(value: string): string {
    return this.paymentMethods.find(p => p.value === value)?.label || value;
  }

  getVariationTypeLabel(type: string): string {
    const labels: Record<string, string> = { size: 'Tamanho', addon: 'Adicional', removal: 'Remoção', custom: 'Custom' };
    return labels[type] || type;
  }

  getVariationNames(variations: ProductVariation[]): string {
    return variations.map(v => v.name).join(', ');
  }

  submitOrder(): void {
    if (!this.selectedCustomer || this.cart.length === 0) return;

    this.submitting = true;

    const order: CreateOrderDto = {
      customerId: this.selectedCustomer.id,
      items: this.cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        variations: item.selectedVariations.map(v => ({ variationId: v.id }))
      })),
      paymentMethod: this.paymentMethod || undefined,
      deliveryType: this.deliveryType,
      deliveryAddress: this.deliveryType === 'delivery' ? (this.deliveryAddress || undefined) : undefined,
      notes: this.orderNotes || undefined,
      deliveryFee: this.deliveryType === 'delivery' ? (this.deliveryFee || undefined) : 0
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
      error: (err) => {
        this.submitting = false;
        // 409 = item sem estoque suficiente; a mensagem da API diz qual produto.
        if (err?.status === 409) {
          this.snackBar.open(err.error?.message || 'Item sem estoque.', 'OK', { duration: 5000 });
          this.reloadProducts();
        }
      }
    });
  }
}
