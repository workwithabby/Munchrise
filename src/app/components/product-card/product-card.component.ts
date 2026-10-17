import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonIcon, ToastController } from '@ionic/angular';

import { Product } from '../../models/product.model';
import { PesoPipe } from '../../pipes/peso.pipe';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { FavoritesService } from '../../services/favorites.service';
import { LoginPromptService } from '../../services/login-prompt.service';
import { ProductImageComponent } from '../product-image/product-image.component';

/**
 * Reusable product card — used on Home, Product List, Favorites, ...
 * Shows image (via app-product-image), name, rating, price, heart and add-to-cart.
 */
@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
  standalone: true,
  imports: [IonButton, IonCard, IonIcon, PesoPipe, ProductImageComponent, RouterLink],
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  /** "grid" fills a column, "tile" is a fixed card for horizontal rows. */
  readonly variant = input<'grid' | 'tile'>('grid');

  private readonly cart = inject(CartService);
  private readonly favorites = inject(FavoritesService);
  private readonly toastController = inject(ToastController);
  private readonly auth = inject(AuthService);
  private readonly loginPrompt = inject(LoginPromptService);

  readonly favoriteIds = this.favorites.ids;
  readonly isFavorite = computed(() => this.favoriteIds().includes(this.product().id));

  async toggleFavorite(): Promise<void> {
    if (this.auth.isGuest()) {
      await this.loginPrompt.show();
      return;
    }

    const nowFavorite = this.favorites.toggle(this.product().id);
    await this.toast(nowFavorite ? 'Added to favorites' : 'Removed from favorites', true);
  }

  async addToCart(): Promise<void> {
    if (this.auth.isGuest()) {
      await this.loginPrompt.show();
      return;
    }

    const added = this.cart.add(this.product());

    if (added) {
      await this.toast(`Added ${this.product().name} to cart`, true);
    } else {
      await this.toast(`Only ${this.product().stock} left in stock`, false);
    }
  }

  private async toast(message: string, success: boolean): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1600,
      position: 'top',
      color: success ? 'primary' : 'medium',
    });
    await toast.present();
  }
}
