import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
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

import { NotificationType } from '../../models/notification.model';
import { NotificationService } from '../../services/notification.service';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
/** Every order update, promo and reward alert in one list. */
@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
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
  ],
})
export class NotificationsPage {
  readonly notifications = inject(NotificationService);

  iconFor(type: NotificationType): string {
    switch (type) {
      case 'order':
        return 'fast-food-outline';
      case 'promo':
        return 'pricetags-outline';
      case 'reward':
        return 'gift-outline';
      default:
        return 'notifications-outline';
    }
  }

  markRead(id: string): void {
    this.notifications.markRead(id);
  }
}
