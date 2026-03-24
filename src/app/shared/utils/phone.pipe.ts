import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formata telefone brasileiro para (DDD) 9XXXX-XXXX ou (DDD) XXXX-XXXX
 * Entrada aceita: "11945175747", "11945175747", "5511945175747"
 * Saída: "(11) 94517-5747"
 */
@Pipe({ name: 'phone', standalone: true })
export class PhonePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    const digits = value.replace(/\D/g, '');
    // Remove country code 55 se presente
    const local = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;

    if (local.length === 11) {
      // Celular: (DDD) 9XXXX-XXXX
      return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }
    if (local.length === 10) {
      // Fixo: (DDD) XXXX-XXXX
      return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }
    return value; // não reconhecido, retorna original
  }
}
