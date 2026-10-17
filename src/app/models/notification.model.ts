export type NotificationType = 'order' | 'promo' | 'reward';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  /** ISO date string */
  createdAt: string;
}
