import { AfterViewInit, Component, computed, ElementRef, inject, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, ToastController } from '@ionic/angular';

import { ProductImageComponent } from '../../components/product-image/product-image.component';
import { PesoPipe } from '../../pipes/peso.pipe';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';

interface Perk {
  icon: string;
  title: string;
  text: string;
}

interface Step {
  icon: string;
  title: string;
  text: string;
}

/**
 * Landing page: the first thing a visitor sees after the splash, before they
 * sign up, log in or just look around as a guest.
 */
@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: true,
  imports: [IonButton, IonContent, IonIcon, PesoPipe, ProductImageComponent, RouterLink],
})
export class WelcomePage implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: IntersectionObserver;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  /** Fallback text-mark when the logo file cannot be loaded. */
  readonly logoFailed = signal(false);

  /** A real account is signed in: offer "Continue". Guests still see Sign up / Log in. */
  readonly signedIn = this.auth.isLoggedIn;
  readonly firstName = computed(() => this.auth.displayName().split(' ')[0]);

  /** A taste of the menu, so the page shows real food, not just promises. */
  readonly popular = inject(ProductService).getBestSellers().slice(0, 6);

  readonly perks: Perk[] = [
    { icon: 'bicycle-outline', title: 'Fast delivery', text: 'Hot breakfast at your door, right as your day begins.' },
    { icon: 'gift-outline', title: 'Earn rewards', text: 'Collect points on every order and trade them for treats.' },
    { icon: 'receipt-outline', title: 'Track your order', text: 'Follow it from the kitchen to your doorstep.' },
  ];

  readonly stats = [
    { value: String(inject(ProductService).query({}).length), label: 'breakfast dishes' },
    { value: '2', label: 'promo codes' },
    { value: '1 pt', label: 'per ₱10 spent' },
  ];

  readonly titleWords = 'Breakfast, delivered at sunrise.'.split(' ');
  readonly tickerWords = ['Sandwiches', 'Pancakes', 'Rice bowls', 'Burritos', 'Hash browns', 'Oatmeal', 'Waffles'];

  readonly steps: Step[] = [
    { icon: 'restaurant-outline', title: 'Pick your breakfast', text: 'Browse the menu and add what you crave.' },
    { icon: 'card-outline', title: 'Check out in a few taps', text: 'Choose your address and confirm. No real payment.' },
    { icon: 'bicycle-outline', title: 'Enjoy it hot', text: 'Watch it travel from the kitchen to your door.' },
  ];
  readonly activeStep = signal(0);

  ngAfterViewInit(): void {
    const items = this.host.nativeElement.querySelectorAll<HTMLElement>('.reveal');
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((el) => el.classList.add('reveal--in'));
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('reveal--in');
            this.observer?.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    items.forEach((el) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /** Parallax: the hero art drifts slower than the page. */
  onScroll(ev: Event): void {
    const y = Math.max(0, (ev as CustomEvent<{ scrollTop: number }>).detail.scrollTop);
    this.host.nativeElement.style.setProperty('--scroll', `${Math.min(y, 400)}px`);
  }

  /** Hero decor follows the pointer a little. */
  onPointer(ev: PointerEvent): void {
    const hero = ev.currentTarget as HTMLElement;
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', ((ev.clientX - r.left) / r.width - 0.5).toFixed(3));
    hero.style.setProperty('--my', ((ev.clientY - r.top) / r.height - 0.5).toFixed(3));
  }

  resetPointer(): void {
    const hero = this.host.nativeElement.querySelector<HTMLElement>('.hero');
    hero?.style.setProperty('--mx', '0');
    hero?.style.setProperty('--my', '0');
  }

  /** 3D tilt on mouse/pen hover (skipped on touch). */
  tilt(ev: PointerEvent): void {
    if (ev.pointerType === 'touch') return;
    const el = ev.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width - 0.5;
    const y = (ev.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${(x * 12).toFixed(1)}deg) rotateX(${(-y * 12).toFixed(1)}deg) translateY(-4px)`;
  }

  untilt(ev: PointerEvent): void {
    (ev.currentTarget as HTMLElement).style.transform = '';
  }

  logout(): void {
    this.auth.logout();
  }

  async continueSession(): Promise<void> {
    await this.router.navigateByUrl(this.auth.homePath(), { replaceUrl: true });
  }

  async continueAsGuest(): Promise<void> {
    this.auth.continueAsGuest();
    const toast = await this.toastController.create({
      message: 'Browsing as guest. Enjoy your breakfast!',
      duration: 1800,
      position: 'top',
      color: 'primary',
    });
    await toast.present();
    await this.router.navigateByUrl('/home', { replaceUrl: true });
  }
}
