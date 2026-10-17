import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { Component } from '@angular/core';
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

/** What Munchrise is, what it can do and the demo notes. */
@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
  standalone: true,
  imports: [
    NotificationBellComponent,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonMenuButton,
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
})
export class AboutPage {
  readonly version = '1.0.0';
  readonly tagline = 'Rise, Munch, Repeat!';

  readonly stats = [
    { value: '29', label: 'breakfast items' },
    { value: '2', label: 'promo codes' },
    { value: '1 pt', label: 'per ₱10 spent' },
  ];

  readonly steps = [
    { title: 'Pick your breakfast', text: 'Browse the menu and add what you crave.' },
    { title: 'Check out', text: 'Choose a payment method and use a promo code.' },
    { title: 'Track and enjoy', text: 'Follow your rider live until it arrives.' },
  ];

  readonly features: { icon: string; text: string }[] = [
    { icon: 'fast-food-outline', text: 'Browse 29 breakfast items with filters' },
    { icon: 'cart-outline', text: 'Cart, checkout and order confirmation' },
    { icon: 'pricetags-outline', text: 'Promo codes — RISE10 and MUNCH50' },
    { icon: 'gift-outline', text: 'Loyalty points — 1 point for every ₱10 spent' },
    { icon: 'heart-outline', text: 'Favorites wishlist and product reviews' },
    { icon: 'notifications-outline', text: 'Order tracking and notifications' },
  ];

  readonly notes: { icon: string; text: string }[] = [
    {
      icon: 'card-outline',
      text: 'Payments are simulated. Your chosen payment method is saved with the order, but no money is ever charged.',
    },
    {
      icon: 'cloud-done-outline',
      text: 'Your account, orders and points are saved securely online, so they follow you on any device.',
    },
    { icon: 'star-outline', text: 'Reviews unlock once your order for that item is delivered.' },
  ];
}
