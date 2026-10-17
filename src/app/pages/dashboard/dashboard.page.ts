import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { Component, computed, inject } from '@angular/core';
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
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { RewardsService } from '../../services/rewards.service';

/** The logged-in landing page: points, last order and shortcuts. */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
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
    PesoPipe,
    RouterLink,
  ],
})
export class DashboardPage {
  readonly auth = inject(AuthService);
  readonly rewards = inject(RewardsService);
  readonly orders = inject(OrderService);
  readonly cart = inject(CartService);

  readonly lastOrder = computed(() => this.orders.list()[0]);
  readonly itemCount = computed(() =>
    this.lastOrder()?.items.reduce((total, line) => total + line.quantity, 0) ?? 0,
  );
}
