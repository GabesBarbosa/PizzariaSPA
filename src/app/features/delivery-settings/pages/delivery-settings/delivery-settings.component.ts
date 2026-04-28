import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SettingsService, BusinessOrigin, DeliveryZone } from '../../../../core/services/settings.service';
import { environment } from '../../../../../environments/environment';
import { BrlPipe } from '../../../../shared/utils/brl.pipe';

interface ViaCepInfo {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  uf: string;
}

@Component({
  selector: 'app-delivery-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTableModule,
    MatDividerModule, MatSnackBarModule, MatProgressSpinnerModule,
    BrlPipe,
  ],
  templateUrl: './delivery-settings.component.html',
  styleUrl: './delivery-settings.component.scss',
})
export class DeliverySettingsComponent implements OnInit {
  originForm!: FormGroup;
  zones = signal<DeliveryZone[]>([]);

  loadingOrigin = signal(false);
  savingOrigin = signal(false);
  cepLookingUp = signal(false);
  loadingZones = signal(false);
  savingZones = signal(false);

  hasOrigin = signal(false);

  newZone: DeliveryZone = { minKm: 0, maxKm: 0, fee: 0 };

  constructor(
    private fb: FormBuilder,
    private settings: SettingsService,
    private http: HttpClient,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.originForm = this.fb.group({
      cep:          ['', Validators.required],
      street:       ['', Validators.required],
      number:       ['', Validators.required],
      complement:   [''],
      neighborhood: [''],
      city:         ['', Validators.required],
      uf:           ['', Validators.required],
    });

    this.loadOrigin();
    this.loadZones();
  }

  /* ─── Origin ─── */

  private loadOrigin(): void {
    this.loadingOrigin.set(true);
    this.settings.getOrigin().subscribe({
      next: ({ origin }) => {
        this.loadingOrigin.set(false);
        if (origin) {
          this.hasOrigin.set(true);
          this.originForm.patchValue(origin);
        }
      },
      error: () => this.loadingOrigin.set(false),
    });
  }

  onCepBlur(): void {
    const cep = (this.originForm.value.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) return;

    this.cepLookingUp.set(true);
    this.http.get<ViaCepInfo>(`${environment.apiUrl}/public/cep/${cep}`).subscribe({
      next: (info) => {
        this.originForm.patchValue({
          street: info.street,
          neighborhood: info.neighborhood,
          city: info.city,
          uf: info.uf,
        });
        this.cepLookingUp.set(false);
      },
      error: () => {
        this.cepLookingUp.set(false);
        this.snack.open('CEP não encontrado.', 'OK', { duration: 3000 });
      },
    });
  }

  formatCep(): void {
    const ctrl = this.originForm.get('cep');
    if (!ctrl) return;
    let digits = (ctrl.value || '').replace(/\D/g, '').slice(0, 8);
    const out = digits.length > 5 ? `${digits.substring(0, 5)}-${digits.substring(5)}` : digits;
    ctrl.setValue(out, { emitEvent: false });
  }

  saveOrigin(): void {
    if (this.originForm.invalid) {
      this.originForm.markAllAsTouched();
      return;
    }
    this.savingOrigin.set(true);
    this.settings.saveOrigin(this.originForm.value).subscribe({
      next: ({ origin }) => {
        this.savingOrigin.set(false);
        this.hasOrigin.set(true);
        this.originForm.patchValue(origin);
        this.snack.open('Endereço da loja salvo!', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.savingOrigin.set(false);
        this.snack.open(err?.error?.message || 'Erro ao salvar endereço.', 'OK', { duration: 4000 });
      },
    });
  }

  /* ─── Zones ─── */

  private loadZones(): void {
    this.loadingZones.set(true);
    this.settings.getZones().subscribe({
      next: ({ zones }) => {
        this.loadingZones.set(false);
        this.zones.set(zones);
      },
      error: () => this.loadingZones.set(false),
    });
  }

  addZone(): void {
    if (this.newZone.maxKm <= this.newZone.minKm) {
      this.snack.open('maxKm deve ser maior que minKm.', 'OK', { duration: 2500 });
      return;
    }
    const next = [...this.zones(), { ...this.newZone }].sort((a, b) => a.minKm - b.minKm);
    this.zones.set(next);
    this.newZone = { minKm: next[next.length - 1].maxKm, maxKm: 0, fee: 0 };
  }

  removeZone(index: number): void {
    const next = [...this.zones()];
    next.splice(index, 1);
    this.zones.set(next);
  }

  saveZones(): void {
    if (this.zones().length === 0) {
      this.snack.open('Adicione pelo menos uma faixa.', 'OK', { duration: 2500 });
      return;
    }
    this.savingZones.set(true);
    this.settings.saveZones(this.zones()).subscribe({
      next: ({ zones }) => {
        this.savingZones.set(false);
        this.zones.set(zones);
        this.snack.open('Faixas de frete salvas!', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.savingZones.set(false);
        this.snack.open(err?.error?.message || 'Erro ao salvar faixas.', 'OK', { duration: 4000 });
      },
    });
  }
}
