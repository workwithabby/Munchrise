import { DatePipe } from '@angular/common';
import { computed, Component, inject } from '@angular/core';
import { IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular';
import { RoleTabBarComponent } from '../../components/role-tab-bar/role-tab-bar.component';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { PesoPipe } from '../../pipes/peso.pipe';
import { deliveredAt, RiderService } from '../../services/rider.service';

/** What the rider earned (delivery fees), cash to hand in, and delivery history. */
@Component({
  selector: 'app-rider-earnings',
  templateUrl: './rider-earnings.page.html',
  styleUrls: ['./rider-earnings.page.scss'],
  standalone: true,
  imports: [RoleTabBarComponent, IonFooter, DatePipe, EmptyStateComponent, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar, PesoPipe],
})
export class RiderEarningsPage {
  protected readonly rider = inject(RiderService);
  protected readonly deliveredAt = deliveredAt;

  /** Earnings for each of the last 7 days (oldest first), with a bar height in percent. */
  protected readonly days = computed(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }, (_, i) => {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - (6 - i));
      return { key: start.toISOString(), start, label: start.toLocaleDateString('en', { weekday: 'short' }), today: i === 6, earnings: 0, percent: 0 };
    });

    for (const order of this.rider.completed()) {
      const when = deliveredAt(order);
      const day = days.find((d) => when >= d.start && when < new Date(d.start.getTime() + 86_400_000));
      if (day) day.earnings += order.deliveryFee;
    }

    const max = Math.max(1, ...days.map((d) => d.earnings));
    return days.map((d) => ({ ...d, percent: d.earnings === 0 ? 0 : Math.max(8, (d.earnings / max) * 100) }));
  });
}
