import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { RewardTier } from '../../models/reward.model';
import { PesoPipe } from '../../pipes/peso.pipe';
import { RewardsService } from '../../services/rewards.service';

/** Points balance, tiers you can redeem and your points history. */
@Component({
  selector: 'app-rewards',
  templateUrl: './rewards.page.html',
  styleUrls: ['./rewards.page.scss'],
  standalone: true,
  imports: [
    NotificationBellComponent,
    DatePipe,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonMenuButton,
    IonProgressBar,
    IonTitle,
    IonToolbar,
    PesoPipe,
  ],
})
export class RewardsPage {
  readonly rewards = inject(RewardsService);
  private readonly toastController = inject(ToastController);

  async redeem(tier: RewardTier): Promise<void> {
    const result = await this.rewards.redeem(tier);
    await this.toast(result.message);
  }

  private async toast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
  }
}
