import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonMenuButton, IonTitle, IonToolbar, ToastController, IonFooter } from '@ionic/angular';
import { RoleTabBarComponent } from '../../components/role-tab-bar/role-tab-bar.component';

import { AuthService } from '../../services/auth.service';
import { RiderReviewService } from '../../services/rider-review.service';
import { RiderService, Vehicle } from '../../services/rider.service';

/** The rider's own details: name, phone, vehicle and availability. */
@Component({
  selector: 'app-rider-profile',
  templateUrl: './rider-profile.page.html',
  styleUrls: ['./rider-profile.page.scss'],
  standalone: true,
  imports: [DatePipe, RoleTabBarComponent, IonFooter, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonMenuButton, IonTitle, IonToolbar],
})
export class RiderProfilePage {
  protected readonly auth = inject(AuthService);
  protected readonly rider = inject(RiderService);
  protected readonly ratings = inject(RiderReviewService);
  protected readonly stars = [1, 2, 3, 4, 5];
  private readonly toastController = inject(ToastController);

  readonly vehicles: Vehicle[] = ['Motorcycle', 'Bicycle', 'E-bike'];

  readonly name = signal(this.auth.user()?.name ?? '');
  readonly phone = signal(this.auth.user()?.phone ?? '');
  readonly vehicle = signal<Vehicle>(this.rider.vehicle());
  readonly plate = signal(this.rider.plate());
  readonly error = signal('');
  readonly photoFailed = signal(false);

  readonly roundedAverage = computed(() => Math.round(this.ratings.average()));

  readonly initials = computed(() => {
    const parts = this.auth.displayName().trim().split(/\s+/);
    return ((parts[0]?.[0] ?? 'R') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  });

  async save(): Promise<void> {
    const name = this.name().trim();
    const phone = this.phone().trim();
    if (!name) {
      this.error.set('Please enter your name.');
      return;
    }
    if (phone && !/^[0-9+\-\s]{7,15}$/.test(phone)) {
      this.error.set('Please enter a valid phone number.');
      return;
    }

    this.error.set('');
    this.auth.updateProfile({ name, phone });
    this.rider.setVehicle(this.vehicle(), this.plate());
    const toast = await this.toastController.create({ message: 'Profile saved.', duration: 1400, position: 'top', color: 'primary' });
    await toast.present();
  }
}
