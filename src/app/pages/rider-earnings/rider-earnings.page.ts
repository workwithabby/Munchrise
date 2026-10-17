import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar, IonFooter } from '@ionic/angular';
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
  imports: [RoleTabBarComponent, IonFooter, DatePipe, EmptyStateComponent, IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar, PesoPipe],
})
export class RiderEarningsPage {
  protected readonly rider = inject(RiderService);
  protected readonly deliveredAt = deliveredAt;
}
