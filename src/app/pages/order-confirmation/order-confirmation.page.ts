import { DatePipe } from '@angular/common';
import { computed, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { PesoPipe } from '../../pipes/peso.pipe';
import { OrderLine } from '../../models/order.model';
import { ProductImageComponent } from '../../components/product-image/product-image.component';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
/** Receipt shown right after an order is placed. */
@Component({
  selector: 'app-order-confirmation',
  templateUrl: './order-confirmation.page.html',
  styleUrls: ['./order-confirmation.page.scss'],
  standalone: true,
  imports: [
    DatePipe,
    EmptyStateComponent,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonMenuButton,
    IonTitle,
    IonToolbar,
    PesoPipe,
    ProductImageComponent,
    RouterLink,
  ],
})
export class OrderConfirmationPage {
  private readonly orders = inject(OrderService);
  private readonly products = inject(ProductService);

  /** ":id" from the URL (the order number). */
  readonly id = input.required<string>();

  readonly order = computed(() => this.orders.get(this.id()));

  /** Picture for one receipt line (found through the product's `image`). */
  imageFor(line: OrderLine): string {
    return this.products.getById(line.productId)?.image ?? '';
  }

  /** Category for one receipt line — picks the cover art for the thumbnail. */
  categoryFor(line: OrderLine): string {
    return this.products.getById(line.productId)?.category ?? '';
  }
}
