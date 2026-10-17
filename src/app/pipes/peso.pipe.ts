import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a number as Philippine Peso: 149 -> "₱149.00"
 * Usage in a template: {{ product.price | peso }}
 */
@Pipe({
  name: 'peso',
  standalone: true,
})
export class PesoPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '₱0.00';
    }

    return (
      '₱' +
      value.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
}
