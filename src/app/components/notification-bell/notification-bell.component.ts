import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonIcon, IonPopover } from '@ionic/angular';

import { NotificationType } from '../../models/notification.model';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

let nextId = 0;

/**
 * Bell icon with the unread count: lives in the top bar, for customers (not
 * guests or the admin). Tapping it drops down the latest notifications, with a
 * link to the full page.
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [DatePipe, IonButton, IonIcon, IonPopover],
  template: `
    @if (auth.isUser()) {
      <ion-button
        class="bell-button"
        [id]="triggerId"
        aria-haspopup="dialog"
        [attr.aria-label]="
          notifications.unreadCount() > 0
            ? 'Notifications, ' + notifications.unreadCount() + ' unread'
            : 'Notifications'
        ">
        <ion-icon slot="icon-only" name="notifications-outline"></ion-icon>
        @if (notifications.unreadCount() > 0) {
          <span class="bell-badge" aria-hidden="true">{{
            notifications.unreadCount() > 9 ? '9+' : notifications.unreadCount()
          }}</span>
        }
      </ion-button>

      <ion-popover #pop [trigger]="triggerId" triggerAction="click" side="bottom" alignment="end" cssClass="notif-popover">
        <ng-template>
          <div class="np">
            <div class="np__head">
              <h2>Notifications</h2>
              @if (notifications.unreadCount() > 0) {
                <button type="button" class="np__link" (click)="notifications.markAllRead()">Mark all read</button>
              }
            </div>

            @if (latest().length === 0) {
              <p class="np__empty">
                <ion-icon name="notifications-outline" aria-hidden="true"></ion-icon>
                You are all caught up.
              </p>
            } @else {
              <ul class="np__list">
                @for (n of latest(); track n.id) {
                  <li>
                    <button type="button" class="np__item" [class.is-unread]="!n.read" (click)="notifications.markRead(n.id)">
                      <span class="np__icon" aria-hidden="true"><ion-icon [name]="iconFor(n.type)"></ion-icon></span>
                      <span class="np__text">
                        <span class="np__title">{{ n.title }}</span>
                        <span class="np__msg">{{ n.message }}</span>
                        <time class="np__time">{{ n.createdAt | date: 'MMM d, h:mm a' }}</time>
                      </span>
                      @if (!n.read) { <span class="np__dot"></span> }
                    </button>
                  </li>
                }
              </ul>
            }

            <button type="button" class="np__all" (click)="viewAll(pop)">View all notifications</button>
          </div>
        </ng-template>
      </ion-popover>
    }
  `,
  styles: [
    `
      .bell-button {
        position: relative;
        min-width: 44px;
        min-height: 44px;
        --color: var(--munch-brown);
      }
      .bell-badge {
        /* anchored to the icon's top-right corner, so it fits at any width */
        position: absolute;
        top: 1px;
        right: -3px;
        left: auto;
        min-width: 11px;
        height: 11px;
        padding: 0 2px;
        box-sizing: border-box;
        border-radius: 999px;
        background: var(--munch-orange);
        color: #fff;
        font-size: 8px;
        font-weight: 700;
        line-height: 9px;
        text-align: center;
        border: 1px solid var(--munch-white);
        pointer-events: none;
      }

      .np {
        display: flex;
        flex-direction: column;
        max-height: min(70vh, 520px);
        font-family: var(--munch-font-body);
        color: var(--munch-brown);
        background: var(--surface, #fff);
      }
      .np__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px 10px;
        border-bottom: 1px solid var(--color-border);
      }
      .np__head h2 {
        margin: 0;
        font-family: var(--munch-font-heading);
        font-weight: 400;
        font-size: var(--text-lg);
      }
      .np__link,
      .np__all {
        border: 0;
        background: transparent;
        font-family: inherit;
        font-weight: 600;
        color: var(--munch-orange);
        cursor: pointer;
      }
      .np__link {
        font-size: var(--text-sm);
        min-height: 36px;
      }
      .np__all {
        min-height: 48px;
        border-top: 1px solid var(--color-border);
        font-size: var(--text-md);
      }
      .np__all:active {
        background: var(--color-orange-tint);
      }
      .np__list {
        margin: 0;
        padding: 0;
        list-style: none;
        overflow-y: auto;
      }
      .np__item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        width: 100%;
        padding: 12px 16px;
        border: 0;
        border-bottom: 1px solid var(--color-border);
        background: transparent;
        text-align: left;
        font-family: inherit;
        color: inherit;
        cursor: pointer;
      }
      .np__item.is-unread {
        background: var(--color-orange-tint);
      }
      .np__item:active {
        background: var(--surface-muted);
      }
      .np__icon {
        flex: none;
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: var(--color-orange-tint);
        color: var(--munch-orange);
        font-size: 18px;
      }
      .np__text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .np__title {
        font-weight: 700;
        font-size: var(--text-sm);
      }
      .np__msg {
        font-size: var(--text-sm);
        color: var(--color-muted-text);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .np__time {
        font-size: var(--text-xs);
        color: var(--color-muted-text);
      }
      .np__dot {
        flex: none;
        width: 8px;
        height: 8px;
        margin-top: 6px;
        border-radius: 50%;
        background: var(--munch-orange);
      }
      .np__empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        margin: 0;
        padding: 28px 16px;
        color: var(--color-muted-text);
      }
      .np__empty ion-icon {
        font-size: 28px;
      }
    `,
  ],
})
export class NotificationBellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly triggerId = `bell-trigger-${nextId++}`;
  protected readonly latest = computed(() => this.notifications.items().slice(0, 5));

  protected iconFor(type: NotificationType): string {
    return type === 'order' ? 'fast-food-outline' : type === 'promo' ? 'pricetags-outline' : 'gift-outline';
  }

  protected async viewAll(popover: IonPopover): Promise<void> {
    await popover.dismiss();
    await this.router.navigateByUrl('/notifications');
  }
}
