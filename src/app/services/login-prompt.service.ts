import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

/**
 * The popup guests see when they try to do something that needs an account
 * (add to cart, favorite, change quantity, write a review).
 */
@Injectable({ providedIn: 'root' })
export class LoginPromptService {
  private readonly alertController = inject(AlertController);
  private readonly router = inject(Router);

  async show(): Promise<void> {
    const alert = await this.alertController.create({
      message: 'Create an account to order. Sign up or log in to continue.',
      buttons: [
        {
          text: 'Sign up',
          handler: () => {
            void this.router.navigateByUrl('/signup');
          },
        },
        {
          text: 'Log in',
          handler: () => {
            void this.router.navigateByUrl('/login');
          },
        },
      ],
    });

    await alert.present();
  }
}
