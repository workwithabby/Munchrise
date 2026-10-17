import { Routes } from '@angular/router';

import { adminGuard, authGuard, memberGuard, resetGuard, riderGuard, sessionGuard } from './guards/access.guard';

export const routes: Routes = [
  // The splash is the first screen: '' redirects to it, so the splash page owns
  // the URL '/splash'. That matters: Ionic's stack controller reuses an existing
  // view when the new route's URL matches one already in the stack. Splash and
  // the tab parent are both empty-path routes — at '/home' the tab parent still
  // serializes to '/' — so if the splash also sat at '/', Ionic would "reuse"
  // the splash view for the tabs route, never create <app-tabs> and leave the
  // screen blank forever after the splash fades. Distinct URLs avoid the clash.
  { path: '', pathMatch: 'full', redirectTo: 'splash' },
  {
    path: 'splash',
    pathMatch: 'full',
    loadComponent: () => import('./pages/splash/splash.page').then((m) => m.SplashPage),
  },

  // Bottom tab bar: Home, Menu (products), Cart, Orders, Profile — plus the
  // side-menu pages (favorites, rewards, …) so the bar stays visible on them.
  // These five pages share the frosted tab bar; the URLs stay the same
  // (/home, /products, …) because the parent path is empty.
  {
    path: '',
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/products/products.page').then((m) => m.ProductsPage),
      },
      {
        path: 'cart',
        canActivate: [memberGuard],
        loadComponent: () => import('./pages/cart/cart.page').then((m) => m.CartPage),
      },
      {
        path: 'orders',
        canActivate: [memberGuard],
        loadComponent: () => import('./pages/orders/orders.page').then((m) => m.OrdersPage),
      },
      {
        path: 'profile',
        canActivate: [memberGuard],
        loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'favorites',
        canActivate: [memberGuard],
        loadComponent: () => import('./pages/favorites/favorites.page').then((m) => m.FavoritesPage),
      },
      {
        path: 'rewards',
        canActivate: [memberGuard],
        loadComponent: () => import('./pages/rewards/rewards.page').then((m) => m.RewardsPage),
      },
      {
        path: 'notifications',
        canActivate: [memberGuard],
        loadComponent: () =>
          import('./pages/notifications/notifications.page').then((m) => m.NotificationsPage),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'about',
        loadComponent: () => import('./pages/about/about.page').then((m) => m.AboutPage),
      },
      {
        path: 'developers',
        loadComponent: () =>
          import('./pages/developers/developers.page').then((m) => m.DevelopersPage),
      },
      {
        path: 'help',
        loadComponent: () => import('./pages/help/help.page').then((m) => m.HelpPage),
      },
    ],
  },

  // Guest CAN open: product details, about, developers. authGuard only blocks
  // people with no session at all (not even guest).
  {
    path: 'product/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/product-details/product-details.page').then((m) => m.ProductDetailsPage),
  },

  // Rate the products and the rider of a delivered order.
  {
    path: 'review-order/:id',
    canActivate: [memberGuard],
    loadComponent: () =>
      import('./pages/review-order/review-order.page').then((m) => m.ReviewOrderPage),
  },

  // Needs a real account (guest is redirected with a toast).
  {
    path: 'checkout',
    canActivate: [memberGuard],
    loadComponent: () => import('./pages/checkout/checkout.page').then((m) => m.CheckoutPage),
  },
  {
    path: 'track/:id',
    canActivate: [memberGuard],
    loadComponent: () =>
      import('./pages/order-tracking/order-tracking.page').then((m) => m.OrderTrackingPage),
  },
  {
    path: 'order-confirmation/:id',
    canActivate: [memberGuard],
    loadComponent: () =>
      import('./pages/order-confirmation/order-confirmation.page').then(
        (m) => m.OrderConfirmationPage,
      ),
  },
  // Landing page: what a new visitor sees after the splash.
  {
    path: 'welcome',
    loadComponent: () => import('./pages/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    // Step 2 of "Forgot password": the same 6-box code screen as sign-up, in reset mode.
    path: 'reset-code',
    data: { mode: 'reset' },
    loadComponent: () => import('./pages/verify-email/verify-email.page').then((m) => m.VerifyEmailPage),
  },
  {
    // Step 3: only reachable after a correct code.
    path: 'new-password',
    canActivate: [resetGuard],
    loadComponent: () => import('./pages/new-password/new-password.page').then((m) => m.NewPasswordPage),
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup.page').then((m) => m.SignupPage),
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./pages/verify-email/verify-email.page').then((m) => m.VerifyEmailPage),
  },

  // Settings: every role (guests get a reduced version).
  {
    path: 'settings',
    canActivate: [sessionGuard],
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },

  // Rider only: orders to pick up and deliver.
  {
    path: 'rider',
    canActivate: [riderGuard],
    loadComponent: () => import('./pages/rider/rider.page').then((m) => m.RiderPage),
  },
  {
    path: 'rider/earnings',
    canActivate: [riderGuard],
    loadComponent: () =>
      import('./pages/rider-earnings/rider-earnings.page').then((m) => m.RiderEarningsPage),
  },
  {
    path: 'rider/profile',
    canActivate: [riderGuard],
    loadComponent: () =>
      import('./pages/rider-profile/rider-profile.page').then((m) => m.RiderProfilePage),
  },

  // Admin only: product management, stock, orders and reviews.
  // Everyone else is sent to /home.
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/admin-overview/admin-overview.page').then((m) => m.AdminOverviewPage),
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/admin/admin.page').then((m) => m.AdminPage),
      },
      {
        path: 'promos',
        loadComponent: () => import('./pages/admin-promos/admin-promos.page').then((m) => m.AdminPromosPage),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./pages/admin-inventory/admin-inventory.page').then((m) => m.AdminInventoryPage),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/admin-orders/admin-orders.page').then((m) => m.AdminOrdersPage),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./pages/admin-reviews/admin-reviews.page').then((m) => m.AdminReviewsPage),
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin-users/admin-users.page').then((m) => m.AdminUsersPage),
      },
    ],
  },

  { path: '**', redirectTo: 'home' },
];
