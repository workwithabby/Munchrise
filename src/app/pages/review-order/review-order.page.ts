import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { ProductImageComponent } from '../../components/product-image/product-image.component';
import { OrderLine } from '../../models/order.model';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';
import { ReviewService } from '../../services/review.service';
import { RiderReviewService } from '../../services/rider-review.service';

/** After delivery: rate each product from the order and the rider who brought it. */
@Component({
  selector: 'app-review-order',
  templateUrl: './review-order.page.html',
  styleUrls: ['./review-order.page.scss'],
  standalone: true,
  imports: [
    EmptyStateComponent,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonTextarea,
    IonTitle,
    IonToolbar,
    ProductImageComponent,
    RouterLink,
  ],
})
export class ReviewOrderPage {
  private readonly orders = inject(OrderService);
  private readonly products = inject(ProductService);
  private readonly reviews = inject(ReviewService);
  private readonly riderReviews = inject(RiderReviewService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  /** ":id" from the URL (the order number). */
  readonly id = input.required<string>();

  readonly order = computed(() => this.orders.get(this.id()));
  readonly canReview = computed(() => this.order()?.status === 'Delivered');

  readonly stars = [1, 2, 3, 4, 5];
  readonly saving = signal(false);

  /** Stars (0 = not rated, skipped) and comment per product id. */
  readonly ratings = signal<Record<number, number>>({});
  readonly comments = signal<Record<number, string>>({});
  readonly riderRating = signal(0);
  readonly riderComment = signal('');

  /** Products of this order, with whether the person already reviewed them. */
  readonly lines = computed(() =>
    (this.order()?.items ?? []).map((line) => ({
      line,
      done: this.reviews.forProduct(line.productId).some((r) => this.reviews.isMine(r)),
    })),
  );

  readonly riderDone = computed(() => this.riderReviews.forOrder(this.id()));
  readonly hasRider = computed(() => !!this.order()?.riderName);

  /** Anything new to send? */
  readonly canSubmit = computed(
    () =>
      this.lines().some((l) => !l.done && (this.ratings()[l.line.productId] ?? 0) > 0) ||
      (this.hasRider() && !this.riderDone() && this.riderRating() > 0),
  );

  imageFor(line: OrderLine): string {
    return this.products.getById(line.productId)?.image ?? '';
  }

  categoryFor(line: OrderLine): string {
    return this.products.getById(line.productId)?.category ?? '';
  }

  rate(productId: number, stars: number): void {
    this.ratings.update((r) => ({ ...r, [productId]: stars }));
  }

  comment(productId: number, text: string): void {
    this.comments.update((c) => ({ ...c, [productId]: text }));
  }

  async submit(): Promise<void> {
    const order = this.order();
    if (!order || this.saving()) return;
    this.saving.set(true);
    const author = this.auth.displayName();

    for (const { line, done } of this.lines()) {
      const stars = this.ratings()[line.productId] ?? 0;
      if (!done && stars > 0) {
        this.reviews.add(line.productId, stars, this.comments()[line.productId] ?? '', author);
      }
    }

    let riderFailed = false;
    if (this.hasRider() && !this.riderDone() && this.riderRating() > 0) {
      riderFailed = !(await this.riderReviews.add(order.id, order.riderId, this.riderRating(), this.riderComment(), author));
    }

    this.saving.set(false);
    await this.toast(riderFailed ? 'Product reviews sent, but the rider rating could not be saved.' : 'Thanks for your review!');
    await this.router.navigateByUrl('/orders', { replaceUrl: true });
  }

  private async toast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2000, position: 'top', color: 'primary' });
    await toast.present();
  }
}
