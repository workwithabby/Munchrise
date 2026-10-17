import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { Component, computed, signal } from '@angular/core';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

interface Faq {
  icon: string;
  q: string;
  a: string;
}

/** FAQ + contact shortcuts — the side menu's Help & Support module. */
@Component({
  selector: 'app-help',
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
  standalone: true,
  imports: [
    NotificationBellComponent,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonTitle,
    IonToolbar,
  ],
})
export class HelpPage {
  /** Which FAQ answer is open (null = all closed). */
  readonly openIndex = signal<number | null>(0);

  readonly faqs: Faq[] = [
    {
      icon: 'bag-check-outline',
      q: 'How do I place an order?',
      a: 'Browse the menu, add items to your cart, then open Checkout. Pick a payment method, apply a promo code if you like, and confirm — your order appears in Order History right away.',
    },
    {
      icon: 'star-outline',
      q: 'When can I write a review?',
      a: 'After your order containing that item is delivered. Once it is delivered, the product page shows the "Write a review" form.',
    },
    {
      icon: 'gift-outline',
      q: 'How do rewards points work?',
      a: 'You earn 1 point for every ₱10 you spend. Points show up on your Dashboard and can be redeemed as vouchers at Checkout.',
    },
    {
      icon: 'pricetags-outline',
      q: 'Which promo codes can I use?',
      a: 'RISE10 gives 10% off your order, and MUNCH50 takes ₱50 off when your subtotal is at least ₱300.',
    },
    {
      icon: 'refresh-outline',
      q: 'Can I cancel or change an order?',
      a: 'Orders go straight to the kitchen, so they cannot be cancelled in the app. If something is wrong, email or call us and we will help. You can always reorder your favorites from Order History.',
    },
    {
      icon: 'card-outline',
      q: 'Does the app charge my card?',
      a: 'No. Payments in Munchrise are simulated. You can choose GCash, card or Cash on Delivery and the choice is saved with your order, but no money is ever charged.',
    },
  ];

  /** Search text typed in the hero box. */
  readonly query = signal('');

  /** The questions that match the search (all of them when it is empty). */
  readonly visibleFaqs = computed(() => {
    const needle = this.query().trim().toLowerCase();
    return needle ? this.faqs.filter((f) => (f.q + ' ' + f.a).toLowerCase().includes(needle)) : this.faqs;
  });

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  indexOf(faq: Faq): number {
    return this.faqs.indexOf(faq);
  }

  isOpen(faq: Faq): boolean {
    return this.openIndex() === this.indexOf(faq);
  }

  toggle(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }
}
