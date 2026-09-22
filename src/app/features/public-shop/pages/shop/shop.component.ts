import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';

import { BrlPipe } from '../../../../shared/utils/brl.pipe';
import {
  PublicShopService,
  PublicBusinessDto,
  PublicProductDto,
  PublicVariationDto,
  PaymentMethodDto,
  getVariationTypeLabel,
} from '../../services/public-shop.service';

interface CartEntry {
  /** Identifica a linha do carrinho (produto + combinação de variações) pra track do @for. */
  key: string;
  product: PublicProductDto;
  quantity: number;
  selectedVariations: PublicVariationDto[];
}

function cartEntryKey(productId: string, variations: PublicVariationDto[]): string {
  return `${productId}::${variations.map(v => v.id).sort().join(',')}`;
}

type Stage = 'menu' | 'checkout' | 'success';

@Component({
  selector: 'app-public-shop',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatDividerModule, MatChipsModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatBadgeModule, MatTabsModule,
    BrlPipe,
  ],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss',
})
export class ShopComponent implements OnInit {
  slug = '';
  tableNumber = signal<number | null>(null);
  stage = signal<Stage>('menu');
  loading = signal(true);
  submitting = signal(false);

  business = signal<PublicBusinessDto | null>(null);
  categories = signal<string[]>([]);
  menuByCategory = signal<Record<string, PublicProductDto[]>>({});
  activeCategory = signal<string>('');
  topProducts = signal<PublicProductDto[]>([]);

  /* Aba do cabeçalho: cardápio x informações do estabelecimento */
  activeTab = signal<'menu' | 'info'>('menu');
  searchTerm = signal('');

  /** Busca global no cardápio; sem termo, cai na categoria selecionada. */
  visibleProducts = computed<PublicProductDto[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.menuByCategory()[this.activeCategory()] ?? [];
    return Object.values(this.menuByCategory())
      .flat()
      .filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term));
  });

  cart = signal<CartEntry[]>([]);
  cartCount = computed(() => this.cart().reduce((s, i) => s + i.quantity, 0));
  cartSubtotal = computed(() => this.cart().reduce((s, i) => s + i.quantity * this.unitPrice(i.product, i.selectedVariations), 0));

  /* ─── Seletor de variações (adicionais, tamanhos, etc.) ─── */
  pickingProduct = signal<PublicProductDto | null>(null);
  pickingVariationIds = signal<Set<string>>(new Set());
  pickingQuantity = signal(1);

  deliveryType = signal<'delivery' | 'pickup'>('delivery');

  form!: FormGroup;
  shippingFee = signal<number | null>(null);
  shippingKm = signal<number | null>(null);
  shippingError = signal<string | null>(null);
  shippingLoading = signal(false);
  cepLoading = signal(false);
  phoneLookupLoading = signal(false);
  customerFound = signal(false);

  orderTotal = computed(() => this.cartSubtotal() + (this.deliveryType() === 'delivery' ? (this.shippingFee() ?? 0) : 0));

  finishedOrderId = signal<number | null>(null);

  paymentMethods = signal<PaymentMethodDto[]>([]);

  constructor(
    private route: ActivatedRoute,
    private shop: PublicShopService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') || '';
    const tokenParam = this.route.snapshot.queryParamMap.get('token') || '';
    const tableParam = this.route.snapshot.queryParamMap.get('table');
    if (tableParam) {
      const n = parseInt(tableParam, 10);
      if (!isNaN(n) && n > 0) this.tableNumber.set(n);
    }

    const isTable = this.tableNumber() !== null;

    this.form = this.fb.group({
      name:       ['', isTable ? [Validators.minLength(3)] : [Validators.required, Validators.minLength(3)]],
      phone:      ['', isTable ? [] : [Validators.required]],
      cep:        ['', isTable ? [] : [Validators.required]],
      street:     [''],
      number:     ['', isTable ? [] : [Validators.required]],
      complement: [''],
      neighborhood: [''],
      city:       [''],
      uf:         [''],
      paymentMethod: ['', [Validators.required]],
      changeFor:  [''],
      notes:      [''],
    });

    if (tokenParam) {
      this.shop.getCustomerByToken(this.slug, tokenParam).subscribe({
        next: (customer) => {
          this.form.patchValue({
            name:         customer.name,
            phone:        customer.phone,
            cep:          customer.cep          || '',
            street:       customer.street       || '',
            number:       customer.number       || '',
            complement:   customer.complement   || '',
            neighborhood: customer.neighborhood || '',
            city:         customer.city         || '',
            uf:           customer.uf           || '',
          });
        },
        error: () => {},
      });
    }

    this.shop.getBusiness(this.slug).subscribe({
      next: (biz) => {
        this.business.set(biz);
        this.paymentMethods.set(biz.paymentMethods);
      },
      error: () => {
        this.snack.open('Estabelecimento não encontrado.', 'OK', { duration: 4000 });
      },
    });

    this.loadMenu();

    this.shop.getTopProducts(this.slug).subscribe({
      next: (tops) => this.topProducts.set(tops),
      error: () => {},
    });
  }

  /** Carrega o cardápio; esgotados vão para o fim de cada categoria. */
  private loadMenu(keepCategory = false): void {
    this.shop.getMenu(this.slug).subscribe({
      next: (menu) => {
        const ordered: Record<string, PublicProductDto[]> = {};
        for (const [cat, items] of Object.entries(menu.categories)) {
          ordered[cat] = [...items].sort(
            (a, b) => Number(a.available === false) - Number(b.available === false)
          );
        }
        const cats = Object.keys(ordered).sort();
        this.menuByCategory.set(ordered);
        this.categories.set(cats);
        if (!keepCategory || !cats.includes(this.activeCategory())) {
          this.activeCategory.set(cats[0] || '');
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Erro ao carregar cardápio.', 'OK', { duration: 4000 });
      },
    });
  }

  /* ─── Cart ─── */

  /** Produto esgotado: existe no cardápio, mas não entra na sacola. */
  isUnavailable(product: PublicProductDto): boolean {
    return product.available === false;
  }

  /** Limite de unidades: só existe para produtos com estoque controlado. */
  private stockLimit(product: PublicProductDto): number | null {
    return product.stockQuantity === null || product.stockQuantity === undefined
      ? null
      : product.stockQuantity;
  }

  /** Soma as unidades já na sacola desse produto, somando todas as combinações de adicionais. */
  private quantityInCart(productId: string): number {
    return this.cart()
      .filter(i => i.product.id === productId)
      .reduce((s, i) => s + i.quantity, 0);
  }

  /** Preço unitário do produto já somando os modificadores das variações escolhidas. */
  unitPrice(product: PublicProductDto, variations: PublicVariationDto[]): number {
    return product.price + variations.reduce((s, v) => s + v.priceModifier, 0);
  }

  /** Toque no item do cardápio: abre o seletor de adicionais/tamanhos quando existem, senão adiciona direto. */
  addToCart(product: PublicProductDto): void {
    if (this.isUnavailable(product)) {
      this.snack.open(`${product.name} está esgotado no momento.`, 'OK', { duration: 3000 });
      return;
    }

    if (product.variations?.length) {
      this.openVariationPicker(product);
      return;
    }

    const current = this.cart();
    const idx = current.findIndex(i => i.product.id === product.id && i.selectedVariations.length === 0);
    const limit = this.stockLimit(product);

    if (idx >= 0) {
      if (limit !== null && current[idx].quantity >= limit) {
        this.snack.open(`Restam apenas ${limit} unidade(s) de ${product.name}.`, 'OK', { duration: 3000 });
        return;
      }
      const next = [...current];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
      this.cart.set(next);
    } else {
      this.cart.set([...current, { key: cartEntryKey(product.id, []), product, quantity: 1, selectedVariations: [] }]);
    }
  }

  changeQty(index: number, delta: number): void {
    const next = [...this.cart()];
    const item = { ...next[index] };
    const limit = this.stockLimit(item.product);

    if (delta > 0 && limit !== null && item.quantity >= limit) {
      this.snack.open(`Restam apenas ${limit} unidade(s) de ${item.product.name}.`, 'OK', { duration: 3000 });
      return;
    }

    item.quantity += delta;
    if (item.quantity <= 0) {
      next.splice(index, 1);
    } else {
      next[index] = item;
    }
    this.cart.set(next);
  }

  /* ─── Seletor de variações ─── */

  openVariationPicker(product: PublicProductDto): void {
    this.pickingProduct.set(product);
    this.pickingVariationIds.set(new Set());
    this.pickingQuantity.set(1);
  }

  closeVariationPicker(): void {
    this.pickingProduct.set(null);
  }

  /** Variações agrupadas por tipo, na ordem em que aparecem no produto. */
  pickingGroups = computed<{ type: string; label: string; items: PublicVariationDto[] }[]>(() => {
    const product = this.pickingProduct();
    if (!product?.variations?.length) return [];
    const order: string[] = [];
    const byType = new Map<string, PublicVariationDto[]>();
    for (const v of product.variations) {
      if (!byType.has(v.type)) { byType.set(v.type, []); order.push(v.type); }
      byType.get(v.type)!.push(v);
    }
    return order.map(type => ({ type, label: getVariationTypeLabel(type), items: byType.get(type)! }));
  });

  isVariationPicked(v: PublicVariationDto): boolean {
    return this.pickingVariationIds().has(v.id);
  }

  /** Tamanho é escolha única (como um rádio); os demais tipos aceitam múltipla escolha. */
  toggleVariation(v: PublicVariationDto, groupType: string): void {
    const ids = new Set(this.pickingVariationIds());
    const product = this.pickingProduct();
    if (groupType === 'size' && product) {
      for (const other of product.variations || []) {
        if (other.type === 'size') ids.delete(other.id);
      }
      if (!this.pickingVariationIds().has(v.id)) ids.add(v.id);
    } else {
      ids.has(v.id) ? ids.delete(v.id) : ids.add(v.id);
    }
    this.pickingVariationIds.set(ids);
  }

  pickingSelectedVariations = computed<PublicVariationDto[]>(() => {
    const product = this.pickingProduct();
    if (!product?.variations) return [];
    const ids = this.pickingVariationIds();
    return product.variations.filter(v => ids.has(v.id));
  });

  pickingUnitPrice = computed(() => {
    const product = this.pickingProduct();
    return product ? this.unitPrice(product, this.pickingSelectedVariations()) : 0;
  });

  changePickingQuantity(delta: number): void {
    this.pickingQuantity.update(q => Math.max(1, q + delta));
  }

  confirmVariationPick(): void {
    const product = this.pickingProduct();
    if (!product) return;

    const limit = this.stockLimit(product);
    const already = this.quantityInCart(product.id);
    if (limit !== null && already + this.pickingQuantity() > limit) {
      const remaining = Math.max(0, limit - already);
      this.snack.open(`Restam apenas ${remaining} unidade(s) de ${product.name}.`, 'OK', { duration: 3000 });
      return;
    }

    const variations = this.pickingSelectedVariations();
    const key = cartEntryKey(product.id, variations);
    const current = this.cart();
    const idx = current.findIndex(i => i.key === key);

    if (idx >= 0) {
      const next = [...current];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + this.pickingQuantity() };
      this.cart.set(next);
    } else {
      this.cart.set([...current, { key, product, quantity: this.pickingQuantity(), selectedVariations: variations }]);
    }

    this.closeVariationPicker();
  }

  variationNames(variations: PublicVariationDto[]): string {
    return variations.map(v => v.name).join(', ');
  }

  removeFromCart(index: number): void {
    const next = [...this.cart()];
    next.splice(index, 1);
    this.cart.set(next);
  }

  /* ─── Delivery type ─── */

  setDeliveryType(type: 'delivery' | 'pickup'): void {
    this.deliveryType.set(type);
    const isTable = this.tableNumber() !== null;
    if (type === 'pickup') {
      this.form.get('cep')!.clearValidators();
      this.form.get('number')!.clearValidators();
      this.form.get('cep')!.updateValueAndValidity();
      this.form.get('number')!.updateValueAndValidity();
      this.shippingFee.set(null);
      this.shippingError.set(null);
    } else {
      if (!isTable) {
        this.form.get('cep')!.setValidators([Validators.required]);
        this.form.get('number')!.setValidators([Validators.required]);
        this.form.get('cep')!.updateValueAndValidity();
        this.form.get('number')!.updateValueAndValidity();
      }
    }
  }

  /* ─── Stages ─── */

  goToCheckout(): void {
    if (this.cart().length === 0) {
      this.snack.open('Seu carrinho está vazio.', 'OK', { duration: 2500 });
      return;
    }
    this.stage.set('checkout');
  }

  backToMenu(): void {
    this.stage.set('menu');
  }

  /* ─── CEP + frete ─── */

  onCepBlur(): void {
    const raw = (this.form.value.cep || '').replace(/\D/g, '');
    if (raw.length !== 8) return;

    this.cepLoading.set(true);
    this.shop.lookupCep(raw).subscribe({
      next: (info) => {
        this.form.patchValue({
          street: info.street,
          neighborhood: info.neighborhood,
          city: info.city,
          uf: info.uf,
        });
        this.cepLoading.set(false);
        this.tryQuoteShipping();
      },
      error: () => {
        this.cepLoading.set(false);
        this.snack.open('CEP não encontrado.', 'OK', { duration: 3000 });
      },
    });
  }

  onNumberBlur(): void {
    this.tryQuoteShipping();
  }

  private tryQuoteShipping(): void {
    const { cep, number, street, neighborhood, city, uf } = this.form.value;
    if (!cep || !number || !street) return;

    this.shippingLoading.set(true);
    this.shippingError.set(null);

    this.shop.quoteShipping(this.slug, { cep, number, street, neighborhood, city, uf }).subscribe({
      next: (res) => {
        this.shippingLoading.set(false);
        if (res.outOfRange) {
          this.shippingError.set(`Endereço fora da área de entrega (${res.distanceKm} km).`);
          this.shippingFee.set(null);
          this.shippingKm.set(res.distanceKm);
        } else {
          this.shippingFee.set(res.fee);
          this.shippingKm.set(res.distanceKm);
        }
      },
      error: (err) => {
        this.shippingLoading.set(false);
        this.shippingFee.set(null);
        const msg = err?.error?.message || 'Falha ao calcular o frete.';
        this.shippingError.set(msg);
      },
    });
  }

  /* ─── Submit ─── */

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Preencha todos os campos obrigatórios.', 'OK', { duration: 3000 });
      return;
    }
    const isTable = this.tableNumber() !== null;
    const isDelivery = this.deliveryType() === 'delivery';

    if (!isTable && isDelivery && this.shippingFee() === null) {
      this.snack.open('Aguarde o cálculo do frete ou revise o endereço.', 'OK', { duration: 3000 });
      return;
    }

    this.submitting.set(true);
    const v = this.form.value;

    const placeOrder = (customerId: string | null) => {
      const address = (isTable || !isDelivery) ? undefined :
        [v.street, v.number].filter(Boolean).join(', ') +
        (v.complement ? ` (${v.complement})` : '') +
        (v.neighborhood ? ` - ${v.neighborhood}` : '') +
        (v.city && v.uf ? `, ${v.city}/${v.uf}` : '');

      this.shop.createOrder(this.slug, {
        customerId: customerId as any,
        items: this.cart().map(c => ({
          productId: c.product.id,
          quantity: c.quantity,
          variations: c.selectedVariations.map(v => ({ variationId: v.id })),
        })),
        paymentMethod: v.paymentMethod,
        changeFor: v.changeFor ? parseFloat(v.changeFor) : undefined,
        deliveryAddress: address,
        deliveryFee: (isTable || !isDelivery) ? 0 : this.shippingFee()!,
        notes: v.notes || undefined,
        tableNumber: this.tableNumber() ?? undefined,
      }).subscribe({
        next: (order) => {
          this.submitting.set(false);
          this.finishedOrderId.set(order.id);
          this.cart.set([]);
          this.stage.set('success');
        },
        error: (err) => {
          this.submitting.set(false);
          // 409 = algum item esgotou entre a montagem da sacola e o envio do pedido.
          if (err?.status === 409) {
            this.snack.open(err.error?.message || 'Um item da sacola esgotou.', 'OK', { duration: 5000 });
            this.loadMenu(true);
            this.stage.set('menu');
            return;
          }
          this.snack.open('Erro ao finalizar o pedido.', 'OK', { duration: 4000 });
        },
      });
    };

    if (isTable || !isDelivery) {
      if (!isTable && v.name) {
        this.shop.upsertCustomer(this.slug, {
          name: v.name,
          phone: v.phone || '',
          cep: '', street: '', number: '', complement: '',
          neighborhood: '', city: '', uf: '',
        }).subscribe({
          next: (customer) => placeOrder(customer.id),
          error: () => placeOrder(null),
        });
      } else {
        placeOrder(null);
      }
      return;
    }

    this.shop.upsertCustomer(this.slug, {
      name: v.name,
      phone: v.phone,
      cep: v.cep, street: v.street, number: v.number, complement: v.complement,
      neighborhood: v.neighborhood, city: v.city, uf: v.uf,
    }).subscribe({
      next: (customer) => {
        placeOrder(customer.id);
      },
      error: () => {
        this.submitting.set(false);
        this.snack.open('Erro ao cadastrar cliente.', 'OK', { duration: 4000 });
      },
    });
  }

  onPhoneBlur(): void {
    const digits = (this.form.value.phone || '').replace(/\D/g, '');
    if (digits.length < 10) return;

    this.phoneLookupLoading.set(true);
    this.customerFound.set(false);

    this.shop.lookupCustomerByPhone(this.slug, digits).subscribe({
      next: (customer) => {
        this.phoneLookupLoading.set(false);
        this.customerFound.set(true);
        this.form.patchValue({
          name:         customer.name        || '',
          cep:          customer.cep         || '',
          street:       customer.street      || '',
          number:       customer.number      || '',
          complement:   customer.complement  || '',
          neighborhood: customer.neighborhood || '',
          city:         customer.city        || '',
          uf:           customer.uf          || '',
        });
        if (customer.cep && customer.street && customer.number && this.deliveryType() === 'delivery') {
          this.tryQuoteShipping();
        }
      },
      error: () => {
        this.phoneLookupLoading.set(false);
        this.customerFound.set(false);
      },
    });
  }

  formatPhone(): void {
    const ctrl = this.form.get('phone');
    if (!ctrl) return;
    let digits = (ctrl.value || '').replace(/\D/g, '').slice(0, 11);
    let out = digits;
    if (digits.length > 6) {
      out = `(${digits.substring(0, 2)}) ${digits.substring(2, digits.length - 4)}-${digits.substring(digits.length - 4)}`;
    } else if (digits.length > 2) {
      out = `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    }
    ctrl.setValue(out, { emitEvent: false });
  }

  formatCep(): void {
    const ctrl = this.form.get('cep');
    if (!ctrl) return;
    let digits = (ctrl.value || '').replace(/\D/g, '').slice(0, 8);
    const out = digits.length > 5 ? `${digits.substring(0, 5)}-${digits.substring(5)}` : digits;
    ctrl.setValue(out, { emitEvent: false });
  }

  isCashPayment(): boolean {
    const v = this.form.value.paymentMethod || '';
    return /dinheiro/i.test(v);
  }
}
