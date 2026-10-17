import { computed, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonList,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { ProductImageComponent } from '../../components/product-image/product-image.component';
import { QtyPickerComponent } from '../../components/qty-picker/qty-picker.component';
import { PesoPipe } from '../../pipes/peso.pipe';
import { CartService } from '../../services/cart.service';
import { DELIVERY_FEE, FREE_DELIVERY_MIN } from '../../data/promos';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
/** The shopping cart: quantities, remove, subtotal, checkout. */
@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: true,
  imports: [
    EmptyStateComponent,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonList,
    IonTitle,
    IonToolbar,
    PesoPipe,
    ProductImageComponent,
    QtyPickerComponent,
    RouterLink,
  ],
})
export class CartPage {
  readonly cart = inject(CartService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);

  readonly freeDeliveryMin = FREE_DELIVERY_MIN;

  readonly remainingForFreeDelivery = computed(() =>
    Math.max(0, FREE_DELIVERY_MIN - this.cart.subtotal()),
  );

  readonly estimatedDeliveryFee = computed(() =>
    this.cart.subtotal() >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE,
  );

  readonly estimatedTotal = computed(
    () => this.cart.subtotal() + this.estimatedDeliveryFee(),
  );

  setQuantity(productId: number, quantity: number): void {
    this.cart.setQuantity(productId, quantity);
  }

  async remove(productId: number, name: string): Promise<void> {
    this.cart.remove(productId);
    await this.toast(`Removed ${name} from your cart.`);
  }

  /** "Clear cart" asks first — no browser confirm() here (Capacitor-safe). */
  async confirmClear(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Clear cart?',
      message: 'All items will be removed from your cart.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Clear',
          role: 'destructive',
          handler: () => {
            this.cart.clear();
            void this.toast('Your cart is now empty.');
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1600,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
  }
}
