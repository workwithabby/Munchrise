import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { DatePipe } from '@angular/common';
import { computed, Component, effect, inject, input, signal } from '@angular/core';
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
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { ProductImageComponent } from '../../components/product-image/product-image.component';
import { QtyPickerComponent } from '../../components/qty-picker/qty-picker.component';
import { DragScrollDirective } from '../../directives/drag-scroll.directive';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { Review } from '../../models/review.model';
import { PesoPipe } from '../../pipes/peso.pipe';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { FavoritesService } from '../../services/favorites.service';
import { LoginPromptService } from '../../services/login-prompt.service';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';
import { ReviewService } from '../../services/review.service';

import { CartButtonComponent } from '../../components/cart-button/cart-button.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
/** Everything about one product, plus its ratings & reviews. */
@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.page.html',
  styleUrls: ['./product-details.page.scss'],
  standalone: true,
  imports: [
    NotificationBellComponent,
    CartButtonComponent,
    DatePipe,
    DragScrollDirective,
    EmptyStateComponent,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonTextarea,
    IonTitle,
    IonToolbar,
    PesoPipe,
    ProductCardComponent,
    ProductImageComponent,
    QtyPickerComponent,
    RouterLink,
  ],
})
export class ProductDetailsPage {
  private readonly productService = inject(ProductService);
  readonly cart = inject(CartService);
  private readonly favorites = inject(FavoritesService);
  private readonly reviewService = inject(ReviewService);
  private readonly orders = inject(OrderService);
  /** Public: the template hides the review form from guests. */
  readonly auth = inject(AuthService);
  private readonly loginPrompt = inject(LoginPromptService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);

  /** The ":id" from the URL is bound to this input (enabled in main.ts). */
  readonly id = input.required<string>();

  private readonly productId = computed(() => Number(this.id()));

  /** undefined means the id does not exist */
  readonly product = computed(() => this.productService.getById(this.productId()));

  /** Other items from the same category. */
  readonly related = computed(() => {
    const current = this.product();
    if (!current) return [];
    return this.productService
      .query({ category: current.category, sort: 'rating' })
      .filter((p) => p.id !== current.id)
      .slice(0, 6);
  });

  readonly quantity = signal(1);
  readonly isFavorite = computed(() => this.favorites.ids().includes(this.productId()));

  readonly productReviews = computed(() => this.reviewService.forProduct(this.productId()));
  readonly reviewCount = computed(() => this.productReviews().length);

  /** Guests can read reviews, but writing one needs an account. */
  readonly reviewRating = signal(5);
  readonly reviewText = signal('');
  /** Id of the review being edited, or null when writing a new one. */
  readonly editingId = signal<string | null>(null);

  /** Reviews open only after a delivered order that contains this product. */
  readonly canReview = computed(() => {
    if (this.auth.isGuest()) return false;
    const id = this.productId();
    return this.orders.orders().some(
      (order) =>
        order.status === 'Delivered' &&
        order.items.some((item) => item.productId === id),
    );
  });

  constructor() {
    // Start from 1 and clear the review box when you open another product.
    effect(() => {
      this.productId();
      this.quantity.set(1);
      this.editingId.set(null);
      this.reviewText.set('');
      this.reviewRating.set(5);
    });
  }

  async toggleFavorite(): Promise<void> {
    if (this.auth.isGuest()) {
      await this.loginPrompt.show();
      return;
    }

    const nowFavorite = this.favorites.toggle(this.productId());
    await this.toast(nowFavorite ? 'Added to favorites' : 'Removed from favorites');
  }

  /** Quantity buttons are for members — guests get the sign-up popup. */
  changeQuantity(next: number): void {
    if (this.auth.isGuest()) {
      void this.loginPrompt.show();
      return;
    }
    this.quantity.set(next);
  }

  async addToCart(): Promise<void> {
    const product = this.product();
    if (!product) return;

    if (this.auth.isGuest()) {
      await this.loginPrompt.show();
      return;
    }

    const added = this.cart.add(product, this.quantity());
    if (added) {
      await this.toast(`Added ${this.quantity()} × ${product.name} to cart`);
    } else {
      await this.toast(`Sorry, only ${product.stock} left in stock.`);
    }
  }

  isMine(review: Review): boolean {
    return this.reviewService.isMine(review);
  }

  /** Puts one of your reviews into the form so you can change it. */
  startEdit(review: Review): void {
    if (!this.isMine(review)) return;
    this.editingId.set(review.id);
    this.reviewRating.set(review.rating);
    this.reviewText.set(review.comment);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.reviewText.set('');
    this.reviewRating.set(5);
  }

  async deleteReview(review: Review): Promise<void> {
    if (!this.isMine(review)) return;

    const alert = await this.alertController.create({
      header: 'Delete review?',
      message: 'This removes your review for everyone.',
      buttons: [
        { text: 'Keep it', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.reviewService.remove(review.id);
            if (this.editingId() === review.id) this.cancelEdit();
            void this.toast('Review deleted');
          },
        },
      ],
    });
    await alert.present();
  }

  submitReview(): void {
    const comment = this.reviewText().trim();
    const product = this.product();
    if (!product) return;

    if (this.auth.isGuest()) {
      void this.loginPrompt.show();
      return;
    }

    const editing = this.editingId();
    if (!editing && !this.canReview()) {
      void this.toast('You can review this product once your order is delivered.');
      return;
    }

    if (!comment) {
      void this.toast('Please write a few words first.');
      return;
    }

    if (editing) {
      const saved = this.reviewService.update(editing, this.reviewRating(), comment);
      this.cancelEdit();
      void this.toast(saved ? 'Review updated' : 'You can only edit your own review.');
      return;
    }

    this.reviewService.add(product.id, this.reviewRating(), comment, this.reviewerName());
    this.reviewText.set('');
    this.reviewRating.set(5);
    void this.toast('Thanks for your review!');
  }

  private reviewerName(): string {
    return this.auth.user()?.name ?? 'Guest';
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
