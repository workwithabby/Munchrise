import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NotificationsPage } from './notifications.page';
import { NotificationService } from '../../services/notification.service';

describe('NotificationsPage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.notifications');
    await TestBed.configureTestingModule({
      imports: [NotificationsPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows an empty state', () => {
    const fixture = TestBed.createComponent(NotificationsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nothing yet');
  });

  it('lists notifications and marks them read', async () => {
    const notifications = TestBed.inject(NotificationService);
    notifications.add('Order placed 🎉', 'Your order MR-TEST is now Placed.', 'order');
    expect(notifications.unreadCount()).toBe(1);

    const fixture = TestBed.createComponent(NotificationsPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Order placed 🎉');
    expect(fixture.nativeElement.querySelectorAll('.notif-item').length).toBe(1);

    fixture.componentInstance.markRead(notifications.items()[0].id);
    fixture.detectChanges();

    expect(notifications.unreadCount()).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.unread-dot').length).toBe(0);
  });
});
