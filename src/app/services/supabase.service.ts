import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config/supabase.config';

/**
 * The one Supabase client for the whole app. Every service that talks to the
 * backend (auth, products, orders...) uses `supabase.client`.
 * The login session is kept in the browser's storage and refreshed automatically.
 *
 * `enabled` is false only in unit tests (they swap this service for a stub), which
 * makes the services fall back to their local, offline behaviour.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly enabled: boolean = true;

  readonly client: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}
