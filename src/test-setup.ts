// Polyfills for running unit tests under jsdom (the default Vitest environment).
// Ionic components such as ion-menu and ion-split-pane query `window.matchMedia`,
// which jsdom does not implement.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// Register the app's icons so tests render them like the real app does.
import { registerIcons } from './app/icons';
registerIcons();

// Every spec expects the full seed catalog (30 products). CRUD specs write the
// vendor's catalog to localStorage, which can leak into the next spec file and
// make the suite depend on file order — reset it before each test.
import { TestBed } from '@angular/core/testing';
import { beforeEach } from 'vitest';
import { SupabaseService } from './app/services/supabase.service';
import { TEST_ACCOUNTS } from './test-accounts';

beforeEach(() => {
  // Unit tests never talk to Supabase: services fall back to their local mode.
  TestBed.configureTestingModule({
    providers: [{ provide: SupabaseService, useValue: { enabled: false, client: undefined } }],
  });

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('munchrise.')) {
      localStorage.removeItem(key);
    }
  }

  // Local-mode login needs the fake admin and rider; they live only in test code.
  localStorage.setItem('munchrise.accounts', JSON.stringify(TEST_ACCOUNTS));
});
