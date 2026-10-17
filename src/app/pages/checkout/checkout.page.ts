import { computed, Component, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonRadio,
  IonRadioGroup,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { ProductImageComponent } from '../../components/product-image/product-image.component';
import { PesoPipe } from '../../pipes/peso.pipe';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { RewardsService } from '../../services/rewards.service';
import { PaymentMethod, ShippingInfo } from '../../models/order.model';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
type ErrorMap = Partial<Record<keyof ShippingInfo | 'card', string>>;

/** Shipping form, payment choice, promo code and the order summary. */
@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  standalone: true,
  imports: [
    DatePipe,
    EmptyStateComponent,
    IonBackButton,
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonRadio,
    IonRadioGroup,
    IonTextarea,
    IonTitle,
    IonToolbar,
    PesoPipe,
    ProductImageComponent,
    RouterLink,
  ],
})
export class CheckoutPage {
  readonly cart = inject(CartService);
  private readonly orders = inject(OrderService);
  readonly rewards = inject(RewardsService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  private readonly toastController = inject(ToastController);

  readonly payments: PaymentMethod[] = ['GCash', 'Credit/Debit Card', 'Cash on Delivery'];

  readonly shipping = signal<ShippingInfo>({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    notes: '',
  });
  readonly payment = signal<PaymentMethod>('GCash');

  readonly promoInput = signal('');
  readonly appliedPromo = signal('');
  readonly promoMessage = signal('');

  /** Spend points bought at the Rewards page. */
  readonly useVoucher = signal(false);

  /** Fake card details — shown only for demo purposes and NEVER saved. */
  readonly cardNumber = signal('');
  readonly cardName = signal('');
  readonly cardExpiry = signal('');
  readonly cardCvc = signal('');

  readonly errors = signal<ErrorMap>({});

  /** Fake payment: idle -> processing (spinner) -> success (animated receipt) -> order placed. */
  readonly payStage = signal<'idle' | 'processing' | 'success'>('idle');
  /** Made-up reference number shown on the payment receipt. */
  readonly payRef = signal('');
  readonly payTime = signal(new Date());
  /** Total as charged (frozen when the payment starts). */
  readonly paidAmount = signal(0);

  readonly quote = computed(() =>
    this.orders.quote(
      this.appliedPromo() || undefined,
      this.useVoucher() ? this.rewards.voucherTotal() : 0,
    ),
  );
  readonly isEmpty = computed(() => this.cart.count() === 0);
  readonly needsCardForm = computed(() => this.payment() === 'Credit/Debit Card');

  /** Fields the person typed themselves: profile data never overwrites these. */
  private readonly edited = new Set<keyof ShippingInfo>();

  /** Addresses saved in the profile, offered as one-tap choices. */
  readonly savedAddresses = computed(() => this.auth.user()?.addresses ?? []);

  constructor() {
    // Fill name, mobile number and the first saved address from the profile.
    effect(() => {
      const user = this.auth.user();
      if (!user || user.role === 'guest') return;
      const first = user.addresses[0];
      untracked(() => {
        this.fill('fullName', user.name);
        this.fill('phone', user.phone ?? '');
        if (first) {
          this.fill('address', first.line);
          this.fill('city', first.city);
        }
      });
    });
  }

  private fill(field: keyof ShippingInfo, value: string): void {
    if (!this.edited.has(field) && value) {
      this.shipping.update((current) => ({ ...current, [field]: value }));
    }
  }

  /** Tap a saved address to use it for this order. */
  useAddress(line: string, city: string): void {
    this.edited.add('address');
    this.edited.add('city');
    this.shipping.update((current) => ({ ...current, address: line, city }));
  }

  setShipping(field: keyof ShippingInfo, value: string): void {
    this.edited.add(field);
    this.shipping.update((current) => ({ ...current, [field]: value }));
  }

  selectPayment(method: PaymentMethod): void {
    this.payment.set(method);
  }

  async applyPromo(): Promise<void> {
    const result = this.orders.applyPromo(this.promoInput(), this.cart.subtotal());
    this.promoMessage.set(result.message);

    if (result.ok) {
      this.appliedPromo.set(this.promoInput().trim().toUpperCase());
      await this.toast(result.message);
    }
  }

  async placeOrder(): Promise<void> {
    if (this.isEmpty()) {
      await this.toast('Your cart is empty.');
      return;
    }

    const validation = this.validate();
    this.errors.set(validation);

    if (Object.keys(validation).length > 0) {
      await this.toast('Please check the highlighted fields.');
      return;
    }

    // Cash on Delivery has nothing to pay now; GCash / card get the simulated payment first.
    const paid = this.payment() !== 'Cash on Delivery';
    if (paid) {
      await this.simulatePayment();
    }

    const result = await this.orders.placeOrder({
      shipping: this.shipping(),
      payment: this.payment(),
      promoCode: this.appliedPromo() || undefined,
      rewardDiscount: this.useVoucher() ? this.rewards.voucherTotal() : 0,
      paymentRef: paid ? this.payRef() : undefined,
      paidAt: paid ? this.payTime().toISOString() : undefined,
    });

    this.payStage.set('idle');

    if (result.ok && result.order) {
      await this.toast(result.message);
      // replaceUrl so the back button does not return to an empty checkout
      await this.router.navigateByUrl(`/order-confirmation/${result.order.id}`, {
        replaceUrl: true,
      });
    } else {
      await this.toast(result.message);
    }
  }

  /** Pretend to charge the GCash wallet / card: nothing real happens, no money moves. */
  private async simulatePayment(): Promise<void> {
    this.paidAmount.set(this.quote().total);
    this.payRef.set(`${this.payment() === 'GCash' ? 'GC' : 'CD'}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`);
    this.payTime.set(new Date());
    this.payStage.set('processing');
    await wait(2000);
    this.payStage.set('success');
    await wait(2800);
  }

  /** Simple validation so the professor can see it works. */
  private validate(): ErrorMap {
    const errors: ErrorMap = {};
    const info = this.shipping();

    if (info.fullName.trim().length < 2) {
      errors.fullName = 'Please enter the receiver full name.';
    }

    if (!/^0\d{9,10}$|^\+?\d{10,13}$/.test(info.phone.trim())) {
      errors.phone = 'Enter a valid Philippine mobile number.';
    }

    if (info.address.trim().length < 5) {
      errors.address = 'Please enter a complete street address.';
    }

    if (info.city.trim().length < 2) {
      errors.city = 'Please enter your city / barangay.';
    }

    if (this.needsCardForm()) {
      const digits = this.cardNumber().replace(/\s/g, '');
      if (!/^\d{16}$/.test(digits)) errors.card = 'Card number must be 16 digits (demo only).';
      if (this.cardName().trim().length < 2) errors.card = 'Please enter the name on the card.';
      if (!/^\d{2}\/\d{2}$/.test(this.cardExpiry().trim())) errors.card = 'Expiry must look like 09/28.';
      if (!/^\d{3,4}$/.test(this.cardCvc().trim())) errors.card = 'CVC must be 3 or 4 digits.';
    }

    return errors;
  }

  private async toast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
