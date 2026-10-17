import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { FavoritesService } from '../../services/favorites.service';

import { CartButtonComponent } from '../../components/cart-button/cart-button.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
/** The wishlist. Tap the heart on any product to add or remove it here. */
@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  standalone: true,
  imports: [
    NotificationBellComponent,
    CartButtonComponent,
    EmptyStateComponent,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonMenuButton,
    IonTitle,
    IonToolbar,
    ProductCardComponent,
    RouterLink,
  ],
})
export class FavoritesPage {
  readonly favorites = inject(FavoritesService);
}
