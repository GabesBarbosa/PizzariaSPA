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
  displayedColumns = ['name', 'category', 'price', 'description', 'actions'];

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
      pizza: 'Pizza',
      bebida: 'Bebida',
      outro: 'Outro'
    };
    return labels[category] || category;
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
