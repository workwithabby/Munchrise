import { computed, Component, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { categoryCover, shouldUseCover } from './food-icons';

/**
 * One picture component used everywhere a product is shown.
 *
 * - fixed 3:2 shape with rounded corners, object-fit: cover
 * - soft skeleton shimmer while a real photo loads
 * - category cover (duotone gradient + line-art food icon) when there is no
 *   real photo yet — fully offline, no network images required
 * - clean cream fallback if a real photo link is broken
 *
 * The URL always comes from the product's `image` field, so swapping in your
 * own photos later means editing that one field only.
 */
@Component({
  selector: 'app-product-image',
  templateUrl: './product-image.component.html',
  styleUrls: ['./product-image.component.scss'],
  standalone: true,
})
export class ProductImageComponent {
  private readonly sanitizer = inject(DomSanitizer);

  /** Picture URL — normally product.image. Empty = use the category cover. */
  readonly src = input('');
  /** Product name: used as alt text AND as the fallback label. */
  readonly name = input.required<string>();
  /** Product category: picks which gradient + icon the cover uses. */
  readonly category = input('');

  /** Shown as a shimmer until the picture has loaded. */
  readonly loaded = signal(false);
  /** Swaps to the fallback box when the picture cannot be loaded. */
  readonly failed = signal(false);

  /** True when we should draw the category cover instead of fetching a photo. */
  readonly useCover = computed(() => shouldUseCover(this.src()) || this.failed());

  /** The cover's gradient background for this product's category. */
  readonly coverGradient = computed(() => categoryCover(this.category()).gradient);

  /** Trusted static SVG markup for the category's food icon. */
  readonly coverIcon = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(categoryCover(this.category()).icon),
  );

  constructor() {
    // A new link (e.g. you opened another product) starts fresh.
    effect(() => {
      this.src();
      this.loaded.set(false);
      this.failed.set(false);
    });
  }

  onLoad(): void {
    this.loaded.set(true);
  }

  onError(): void {
    this.failed.set(true);
  }
}
