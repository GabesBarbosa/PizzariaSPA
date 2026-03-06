import { Directive, ElementRef, HostListener, forwardRef, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'input[currencyMask]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyMaskDirective),
      multi: true
    }
  ]
})
export class CurrencyMaskDirective implements ControlValueAccessor, OnInit {
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};
  private rawCents = 0;

  constructor(private el: ElementRef<HTMLInputElement>) {}

  ngOnInit(): void {
    this.el.nativeElement.inputMode = 'numeric';
  }

  writeValue(value: number | null): void {
    if (value == null || value === 0) {
      this.rawCents = 0;
      this.el.nativeElement.value = '';
      return;
    }
    this.rawCents = Math.round(value * 100);
    this.el.nativeElement.value = this.format(this.rawCents);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    this.rawCents = parseInt(digits, 10) || 0;
    input.value = this.rawCents > 0 ? this.format(this.rawCents) : '';
    const numericValue = this.rawCents > 0 ? this.rawCents / 100 : null;
    this.onChange(numericValue);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Allow: backspace, delete, tab, escape, enter, arrows
    const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                     'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(event.key)) return;

    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) return;

    // Block non-digit characters
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  private format(cents: number): string {
    const reais = (cents / 100).toFixed(2);
    const [intPart, decPart] = reais.split('.');
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `R$ ${formatted},${decPart}`;
  }
}
