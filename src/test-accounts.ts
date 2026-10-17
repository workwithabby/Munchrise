import { UserRole } from './app/models/user.model';

/**
 * Fake admin and rider accounts for unit tests ONLY (offline/local mode).
 * Not imported by the app, so these passwords never ship in a build; the real
 * app signs in through Supabase, where roles come from the profiles table.
 */
export interface MockAccount {
  id: string;
  name: string;
  email: string;
  /** Demo only — this is a fake app, never store real passwords like this. */
  password: string;
  role: UserRole;
}

export const TEST_ACCOUNTS: MockAccount[] = [
  {
    id: 'user-admin',
    name: 'Munchrise Admin',
    email: 'admin@munchrise.com',
    password: 'Admin123!',
    role: 'admin',
  },
  {
    id: 'user-rider',
    name: 'Juan Rider',
    email: 'rider@munchrise.com',
    password: 'Rider123!',
    role: 'rider',
  },
];
