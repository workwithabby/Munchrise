import { computed, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/**
 * Small - / + quantity picker.
 * Usage: <app-qty-picker [value]="qty()" [max]="stock" (valueChange)="qty.set($event)" />
 */
@Component({
  selector: 'app-qty-picker',
  templateUrl: './qty-picker.component.html',
  styleUrls: ['./qty-picker.component.scss'],
  standalone: true,
  imports: [IonIcon],
})
export class QtyPickerComponent {
  readonly value = input(1);
  readonly min = input(1);
  readonly max = input(99);

  /** Sends the new quantity back to the parent. */
  readonly valueChange = output<number>();

  readonly canDecrease = computed(() => this.value() > this.min());
  readonly canIncrease = computed(() => this.value() < this.max());

  decrease(): void {
    if (this.canDecrease()) {
      this.valueChange.emit(this.value() - 1);
    }
  }

  increase(): void {
    if (this.canIncrease()) {
      this.valueChange.emit(this.value() + 1);
    }
  }
}
