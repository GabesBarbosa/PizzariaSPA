import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';

import { ProductService, CreateVariationDto } from '../../../../core/services/product.service';
import { ProductVariation } from '../../../../shared/models';
import { CurrencyMaskDirective } from '../../../../shared/utils/currency-mask.directive';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatAutocompleteModule, MatButtonModule, MatIconModule, MatSnackBarModule,
    MatDividerModule, MatListModule, MatChipsModule,
    CurrencyMaskDirective, BrlPipe
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss'
})
export class ProductFormComponent implements OnInit {
  form!: FormGroup;
  variationForm!: FormGroup;
  saving = false;
  isEditMode = false;
  productId: string | null = null;

  variations: ProductVariation[] = [];
  loadingVariations = false;
  savingVariation = false;
  editingVariation: ProductVariation | null = null;

  imagePreview: string | null = null;

  /** Sugestões de categoria: começa com um padrão e ganha as categorias já usadas pelo negócio. */
  categoryOptions: string[] = ['lanche', 'prato', 'bebida', 'sobremesa', 'porcao', 'outro'];

  readonly variationTypes = [
    { value: 'size', label: 'Tamanho' },
    { value: 'addon', label: 'Adicional' },
    { value: 'removal', label: 'Remoção' },
    { value: 'custom', label: 'Personalizado' }
  ];

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
      category: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(0.01)]],
      description: [''],
      // Vazio = produto sem controle de estoque (nunca esgota no cardápio).
      stockQuantity: [null as number | null, [Validators.min(0)]],
      imageBase64: [null as string | null]
    });

    // Junta as categorias já usadas pelo negócio às sugestões padrão, preservando a grafia exata
    // cadastrada (evita que editar um produto force a categoria pra uma das opções fixas antigas).
    this.productService.getAll().subscribe({
      next: (products) => {
        const used = products.map(p => p.category).filter((c): c is string => !!c && c.trim().length > 0);
        this.categoryOptions = Array.from(new Set([...this.categoryOptions, ...used]));
      },
      error: () => {}
    });

    this.variationForm = this.fb.group({
      name: ['', Validators.required],
      type: ['size', Validators.required],
      priceModifier: [0, Validators.required]
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
            description: product.description || '',
            stockQuantity: product.stockQuantity ?? null,
            imageBase64: product.imageBase64 || null
          });
          this.imagePreview = product.imageBase64 || null;
        },
        error: () => {
          this.snackBar.open('Erro ao carregar produto', 'OK', { duration: 3000 });
          this.router.navigate(['/produtos']);
        }
      });
      this.loadVariations();
    }
  }

  loadVariations(): void {
    if (!this.productId) return;
    this.loadingVariations = true;
    this.productService.getVariations(this.productId).subscribe({
      next: (vars) => {
        this.variations = vars;
        this.loadingVariations = false;
      },
      error: () => {
        this.loadingVariations = false;
      }
    });
  }

  /** Sugestões de categoria filtradas pelo que já foi digitado no campo. */
  get filteredCategoryOptions(): string[] {
    const typed = (this.form?.get('category')?.value || '').toString().trim().toLowerCase();
    if (!typed) return this.categoryOptions;
    return this.categoryOptions.filter(c => c.toLowerCase().includes(typed));
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;

    const raw = this.form.value;
    const stock = raw.stockQuantity;
    const payload = {
      ...raw,
      // Preserva a grafia exata (só tira espaços nas pontas) pra não criar categoria duplicada no cardápio.
      category: (raw.category || '').toString().trim(),
      // Campo vazio significa "não controlar estoque" — vai como null para a API.
      stockQuantity: stock === null || stock === undefined || stock === ''
        ? null
        : Math.max(0, Math.floor(Number(stock)))
    };

    const obs = this.isEditMode
      ? this.productService.update(this.productId!, payload)
      : this.productService.create(payload);

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

  startEditVariation(variation: ProductVariation): void {
    this.editingVariation = variation;
    this.variationForm.patchValue({
      name: variation.name,
      type: variation.type,
      priceModifier: variation.priceModifier
    });
  }

  cancelEditVariation(): void {
    this.editingVariation = null;
    this.variationForm.reset({ name: '', type: 'size', priceModifier: 0 });
  }

  saveVariation(): void {
    if (this.variationForm.invalid || !this.productId) return;
    this.savingVariation = true;

    const data: CreateVariationDto = this.variationForm.value;

    const obs = this.editingVariation
      ? this.productService.updateVariation(this.productId, this.editingVariation.id, data)
      : this.productService.createVariation(this.productId, data);

    obs.subscribe({
      next: () => {
        this.savingVariation = false;
        this.editingVariation = null;
        this.variationForm.reset({ name: '', type: 'size', priceModifier: 0 });
        this.loadVariations();
        this.snackBar.open('Variação salva!', 'OK', { duration: 2000 });
      },
      error: () => {
        this.savingVariation = false;
        this.snackBar.open('Erro ao salvar variação', 'OK', { duration: 3000 });
      }
    });
  }

  deleteVariation(variation: ProductVariation): void {
    if (!this.productId) return;
    this.productService.deleteVariation(this.productId, variation.id).subscribe({
      next: () => {
        this.variations = this.variations.filter(v => v.id !== variation.id);
        this.snackBar.open('Variação removida', 'OK', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Erro ao remover variação', 'OK', { duration: 3000 });
      }
    });
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.snackBar.open('Imagem muito grande. Máximo 2MB.', 'OK', { duration: 3000 });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.imagePreview = base64;
      this.form.patchValue({ imageBase64: base64 });
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imagePreview = null;
    this.form.patchValue({ imageBase64: null });
  }

  getVariationTypeLabel(type: string): string {
    return this.variationTypes.find(t => t.value === type)?.label || type;
  }

  getPriceModifierLabel(modifier: number): string {
    if (modifier === 0) return 'sem custo';
    return modifier > 0 ? `+${modifier.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : modifier.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
