import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Product } from '../../../../shared/models';
import { ProductService } from '../../../../core/services/product.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatCardModule, MatChipsModule, MatTooltipModule,
    MatSnackBarModule, MatDialogModule,
    LoadingComponent, BrlPipe
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  loading = true;
  /** Ids com ajuste de estoque em andamento — evita cliques duplicados. */
  adjusting = new Set<string>();
  displayedColumns = ['name', 'category', 'price', 'stock', 'description', 'actions'];

  constructor(
    private productService: ProductService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.productService.getAll().subscribe({
      next: (products) => {
        this.products = products;
        this.loading = false;
      },
      error: () => {
        this.products = [];
        this.loading = false;
      }
    });
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      lanche: 'Lanche',
      prato: 'Prato',
      bebida: 'Bebida',
      sobremesa: 'Sobremesa',
      porcao: 'Porção',
      outro: 'Outro'
    };
    return labels[category] || category;
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      lanche: 'fastfood',
      prato: 'restaurant',
      bebida: 'local_drink',
      sobremesa: 'icecream',
      porcao: 'tapas',
      outro: 'category'
    };
    return icons[category] || 'category';
  }

  /** Produto sem estoque cadastrado (null) nunca esgota. */
  isTracked(product: Product): boolean {
    return product.stockQuantity !== null && product.stockQuantity !== undefined;
  }

  isOutOfStock(product: Product): boolean {
    return this.isTracked(product) && product.stockQuantity! <= 0;
  }

  isLowStock(product: Product): boolean {
    return this.isTracked(product) && product.stockQuantity! > 0 && product.stockQuantity! <= 5;
  }

  getStockLabel(product: Product): string {
    if (!this.isTracked(product)) return 'Sem controle';
    if (product.stockQuantity! <= 0) return 'Esgotado';
    return `${product.stockQuantity} un.`;
  }

  /** Ajuste rápido de estoque direto na listagem (+1 / -1). */
  adjustStock(product: Product, delta: number): void {
    if (!this.isTracked(product)) return;
    if (delta < 0 && product.stockQuantity! <= 0) return;

    this.adjusting.add(product.id);
    this.productService.adjustStock(product.id, delta).subscribe({
      next: (updated) => {
        this.adjusting.delete(product.id);
        product.stockQuantity = updated.stockQuantity;
        this.products = [...this.products];
        if (this.isOutOfStock(product)) {
          this.snackBar.open(`${product.name} esgotou — marcado como indisponível no cardápio`, 'OK', { duration: 3500 });
        }
      },
      error: () => {
        this.adjusting.delete(product.id);
        this.snackBar.open('Erro ao ajustar estoque', 'OK', { duration: 3000 });
      }
    });
  }

  isAdjusting(product: Product): boolean {
    return this.adjusting.has(product.id);
  }

  deleteProduct(product: Product): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Excluir Produto',
        message: `Tem certeza que deseja excluir o produto "${product.name}"?`
      }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.productService.delete(product.id).subscribe({
        next: () => {
          this.products = this.products.filter(p => p.id !== product.id);
          this.snackBar.open('Produto excluído', 'OK', { duration: 2500 });
        },
        error: () => {
          this.snackBar.open('Erro ao excluir produto', 'OK', { duration: 3000 });
        }
      });
    });
  }
}
