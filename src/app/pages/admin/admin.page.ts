import { computed, Component, inject, signal } from '@angular/core';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonModal,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { RoleTabBarComponent } from '../../components/role-tab-bar/role-tab-bar.component';

import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { Product } from '../../models/product.model';
import { PesoPipe } from '../../pipes/peso.pipe';
import { ProductImageComponent } from '../../components/product-image/product-image.component';
import { CartService } from '../../services/cart.service';
import { FavoritesService } from '../../services/favorites.service';
import { ProductInput, ProductService } from '../../services/product.service';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

/** Vendor screen: add / edit / delete products (the admin's only job). */
@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [RoleTabBarComponent,
    EmptyStateComponent,
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonModal,
    IonSearchbar,
        IonSelect,
    IonSelectOption,
    IonTitle,
    IonToggle,
    IonToolbar,
    PesoPipe,
    ProductImageComponent,
  ],
})
export class AdminPage {
  private readonly productsService = inject(ProductService);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly cart = inject(CartService);
  private readonly favorites = inject(FavoritesService);
  private readonly backend = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  /** True while a chosen photo is being resized / uploaded. */
  readonly uploading = signal(false);

  readonly search = signal('');

  readonly categories: string[] = this.productsService.getCategories();

  /** The add / edit form (closed until the vendor opens it). */
  readonly formOpen = signal(false);
  /** null = adding a new product; a number = editing that product. */
  readonly editingId = signal<number | null>(null);
  readonly fName = signal('');
  readonly fDescription = signal('');
  readonly fCategory = signal('');
  readonly fPrice = signal('');
  readonly fStock = signal('');
  readonly fImage = signal('');
  readonly fBestSeller = signal(false);

  /** Picks a photo from the phone, shrinks it and uses it as the product image. */
  async onPhotoChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.formError.set('Please choose an image file.');
      return;
    }

    this.uploading.set(true);
    this.formError.set('');
    try {
      const blob = await shrinkImage(file);
      if (this.backend.enabled) {
        const path = `${this.auth.user()?.id ?? 'admin'}/${Date.now()}.jpg`;
        const bucket = this.backend.client.storage.from('product-images');
        const { error } = await bucket.upload(path, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
        this.fImage.set(bucket.getPublicUrl(path).data.publicUrl);
      } else {
        this.fImage.set(await blobToDataUrl(blob));
      }
    } catch {
      this.formError.set('Could not upload that photo. Please try again.');
    } finally {
      this.uploading.set(false);
    }
  }
  readonly formError = signal('');

  readonly stockFilter = signal<'all' | 'low' | 'out'>('all');
  readonly categoryFilter = signal('All');
  readonly categoryTabs: string[] = ['All', ...this.categories];


  readonly stats = computed(() => {
    this.productsService.revision();
    const all = this.productsService.getAll();
    return {
      total: all.length,
      low: all.filter((p) => this.stockLevel(p) === 'low').length,
      out: all.filter((p) => this.stockLevel(p) === 'out').length,
    };
  });

  readonly products = computed(() => {
    this.productsService.revision();
    const filter = this.stockFilter();
    return this.productsService
      .query({ search: this.search(), category: this.categoryFilter(), sort: 'name' })
      .filter((p) => filter === 'all' || this.stockLevel(p) === filter);
  });

  /** Product count per category (follows the search + stock filter, so numbers match the list). */
  readonly categoryCounts = computed(() => {
    this.productsService.revision();
    const filter = this.stockFilter();
    const counts: Record<string, number> = {};
    for (const tab of this.categoryTabs) {
      counts[tab] = this.productsService
        .query({ search: this.search(), category: tab })
        .filter((p) => filter === 'all' || this.stockLevel(p) === filter).length;
    }
    return counts;
  });

  selectCategory(category: string, event?: Event): void {
    this.categoryFilter.set(category);
    (event?.currentTarget as HTMLElement | null)?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }

  /** Tapping the active stat card again goes back to "all". */
  setStockFilter(filter: 'all' | 'low' | 'out'): void {
    this.stockFilter.set(filter === this.stockFilter() ? 'all' : filter);
  }

  stockLevel(product: Product): 'out' | 'low' | 'ok' {
    if (product.stock === 0) return 'out';
    if (product.stock <= 5) return 'low';
    return 'ok';
  }

  /** One-tap stock change from the list (the +/- buttons). */
  changeStock(product: Product, delta: number): void {
    this.productsService.adjustStock(product.id, delta);
  }

  /** Opens an empty form for a new product. */
  startAdd(): void {
    this.editingId.set(null);
    this.fName.set('');
    this.fDescription.set('');
    this.fCategory.set(this.categories[0] ?? '');
    this.fPrice.set('');
    this.fStock.set('0');
    this.fImage.set('');
    this.fBestSeller.set(false);
    this.formError.set('');
    this.formOpen.set(true);
  }

  /** Opens the form filled with this product. */
  startEdit(product: Product): void {
    this.editingId.set(product.id);
    this.fName.set(product.name);
    this.fDescription.set(product.description);
    this.fCategory.set(product.category);
    this.fPrice.set(String(product.price));
    this.fStock.set(String(product.stock));
    this.fImage.set(product.image);
    this.fBestSeller.set(product.isBestSeller);
    this.formError.set('');
    this.formOpen.set(true);
  }

  cancelForm(): void {
    this.formOpen.set(false);
    this.formError.set('');
  }

  /** Validates the form, then adds or updates the product. */
  async saveForm(): Promise<void> {
    this.formError.set('');

    const name = this.fName().trim();
    if (!name) {
      await this.fail('Please enter a name.');
      return;
    }

    const description = this.fDescription().trim();
    if (!description) {
      await this.fail('Please enter a short description.');
      return;
    }

    const price = Number(this.fPrice());
    if (!Number.isFinite(price) || price <= 0) {
      await this.fail('Price must be more than ₱0.');
      return;
    }

    const stockValue = Number(this.fStock());
    if (
      this.fStock().trim() === '' ||
      !Number.isInteger(stockValue) ||
      stockValue < 0
    ) {
      await this.fail('Stock must be a whole number of 0 or more.');
      return;
    }

    const input: ProductInput = {
      name,
      description,
      category: this.fCategory(),
      price,
      stock: stockValue,
      image: this.fImage(),
      isBestSeller: this.fBestSeller(),
    };

    const editing = this.editingId();
    if (editing === null) {
      try {
        await this.productsService.add(input);
      } catch (error) {
        await this.toast(error instanceof Error ? error.message : 'Could not add the product.');
        return;
      }
      await this.toast('Product added.');
    } else {
      this.productsService.update(editing, input);
      await this.toast('Product updated.');
    }

    this.formOpen.set(false);
  }

  /** Asks "are you sure?" before deleting. */
  async askDelete(product: Product): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete product?',
      message: `${product.name} will be removed from the demo catalog.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => void this.deleteProduct(product) },
      ],
    });
    await alert.present();
  }

  /** Removes the product — and the same item from any cart / wishlist. */
  async deleteProduct(product: Product): Promise<void> {
    this.productsService.remove(product.id);
    this.cart.remove(product.id);
    this.favorites.remove(product.id);
    await this.toast('Product deleted.');
  }

  private async fail(message: string): Promise<void> {
    this.formError.set(message);
    await this.toast(message, 'danger');
  }

  private async toast(message: string, color: 'primary' | 'danger' = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1600,
      position: 'top',
      color,
    });
    await toast.present();
  }
}

/** Scales a photo down to at most 900px and re-saves it as a JPEG (keeps uploads small). */
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.85),
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
