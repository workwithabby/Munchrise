import { Component, inject, Injector } from '@angular/core';
import { IonBadge, IonButton, IonIcon, ModalController } from '@ionic/angular';

import { CartService } from '../../services/cart.service';
import { CartDrawerComponent, drawerEnter, drawerLeave } from '../cart-drawer/cart-drawer.component';

/** Cart icon with a live item count. Tapping it opens the quick-cart drawer from the right. */
@Component({
  selector: 'app-cart-button',
  templateUrl: './cart-button.component.html',
  styleUrls: ['./cart-button.component.scss'],
  standalone: true,
  imports: [IonBadge, IonButton, IonIcon],
})
export class CartButtonComponent {
  protected readonly cart = inject(CartService);
  // Looked up on tap, so the button can render where Ionic's overlay providers are not set up (tests).
  private readonly injector = inject(Injector);
  private opening = false;

  async openDrawer(): Promise<void> {
    if (this.opening) return;
    this.opening = true;
    try {
      const modal = await this.injector.get(ModalController).create({
        component: CartDrawerComponent,
        cssClass: 'cart-drawer',
        enterAnimation: drawerEnter,
        leaveAnimation: drawerLeave,
      });
      await modal.present();
    } finally {
      this.opening = false;
    }
  }
}
