import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AnimationBuilder, createAnimation } from '@ionic/core/components';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonTitle, IonToolbar, ModalController } from '@ionic/angular';

import { PesoPipe } from '../../pipes/peso.pipe';
import { CartService } from '../../services/cart.service';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ProductImageComponent } from '../product-image/product-image.component';
import { QtyPickerComponent } from '../qty-picker/qty-picker.component';

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/** Slides the drawer in from the right edge. */
export const drawerEnter: AnimationBuilder = (baseEl) => {
  const root = baseEl.shadowRoot as ShadowRoot;
  const backdrop = createAnimation()
    .addElement(root.querySelector('ion-backdrop') as HTMLElement)
    .fromTo('opacity', '0.01', 'var(--backdrop-opacity)');
  const wrapper = createAnimation()
    .addElement(root.querySelector('.modal-wrapper') as HTMLElement)
    .fromTo('transform', 'translateX(100%)', 'translateX(0)')
    // Ionic starts overlays at opacity 0.01; a custom animation has to bring it to 1 itself.
    .fromTo('opacity', '1', '1');
  return createAnimation().addElement(baseEl).easing(EASE).duration(320).addAnimation([backdrop, wrapper]);
};

/** ...and back out to the right. */
export const drawerLeave: AnimationBuilder = (baseEl) => {
  const root = baseEl.shadowRoot as ShadowRoot;
  const backdrop = createAnimation()
    .addElement(root.querySelector('ion-backdrop') as HTMLElement)
    .fromTo('opacity', 'var(--backdrop-opacity)', '0');
  const wrapper = createAnimation()
    .addElement(root.querySelector('.modal-wrapper') as HTMLElement)
    .fromTo('transform', 'translateX(0)', 'translateX(100%)');
  return createAnimation().addElement(baseEl).easing(EASE).duration(260).addAnimation([backdrop, wrapper]);
};

/** Quick cart: a panel that opens from the right, with a link to the full cart page. */
@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [EmptyStateComponent, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonTitle, IonToolbar, PesoPipe, ProductImageComponent, QtyPickerComponent],
  templateUrl: './cart-drawer.component.html',
  styleUrls: ['./cart-drawer.component.scss'],
})
export class CartDrawerComponent {
  protected readonly cart = inject(CartService);
  private readonly modalCtrl = inject(ModalController);
  private readonly router = inject(Router);

  close(): Promise<boolean> {
    return this.modalCtrl.dismiss();
  }

  /** Close the panel, then go to a full page. */
  async go(url: string): Promise<void> {
    await this.modalCtrl.dismiss();
    await this.router.navigateByUrl(url);
  }

  setQuantity(productId: number, quantity: number): void {
    this.cart.setQuantity(productId, quantity);
  }
}
