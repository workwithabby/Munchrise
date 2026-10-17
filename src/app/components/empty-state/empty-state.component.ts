import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/**
 * One empty / not-found state for every page: icon circle, title, one line, actions.
 * Usage:
 *   <app-empty-state icon="cart-outline" title="Your cart is empty" text="...">
 *     <ion-button routerLink="/products">Browse the menu</ion-button>
 *   </app-empty-state>
 * Styles live in global.scss (.empty-state).
 */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  standalone: true,
  imports: [IonIcon],
})
export class EmptyStateComponent {
  readonly icon = input('search-outline');
  readonly title = input.required<string>();
  readonly text = input('');
}
