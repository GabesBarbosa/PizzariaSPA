import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'brl', standalone: true })
export class BrlPipe implements PipeTransform {
  /** Aceita número ou texto ("53.80"), porque o MySQL devolve DECIMAL como texto. */
  transform(value: number | string | null | undefined): string {
    const n = Number(value);
    if (value == null || value === '' || isNaN(n)) return 'R$ 0,00';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
