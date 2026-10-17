import { bootstrapApplication } from '@angular/platform-browser';
import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { AppComponent, quickTransition } from './app/app.component';
import { routes } from './app/app.routes';
import { registerIcons } from './app/icons';

/**
 * Fresh start: when this number changes, every saved demo record (accounts,
 * sessions, carts, orders, points, reviews, products, rider data...) is wiped
 * once on the next launch. Bump it whenever you want everyone to start over.
 */
const DATA_VERSION = '2';
const VERSION_KEY = 'munchrise.dataVersion';

try {
  if (localStorage.getItem(VERSION_KEY) !== DATA_VERSION) {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('munchrise.'))
      .forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(VERSION_KEY, DATA_VERSION);
  }
} catch {
  // Storage blocked: nothing saved, nothing to reset.
}

// Every <ion-icon name="..."> in the app must be registered (see app/icons.ts).
registerIcons();

bootstrapApplication(AppComponent, {
  providers: [
    // Ionic needs its own route strategy so pages animate and are reused correctly.
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    // navAnimation applies to every outlet, including the one inside <ion-tabs>.
    // mode 'md' keeps header/title/tab alignment identical on iOS and Android.
    provideIonicAngular({ mode: 'md', navAnimation: quickTransition }),
  ],
}).catch((err) => console.log(err));
