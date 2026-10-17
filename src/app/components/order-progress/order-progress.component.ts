import { Component, computed, input } from '@angular/core';

import { ORDER_FLOW, OrderStatus } from '../../models/order.model';

/** Four small dots + a fill bar that show how far an order has come. */
@Component({
  selector: 'app-order-progress',
  standalone: true,
  template: `
    <div class="op" role="img" [attr.aria-label]="'Order status: ' + status()">
      <span class="op__bar"><span class="op__fill" [style.width.%]="percent()"></span></span>
      <span class="op__dots">
        @for (step of flow; track step; let i = $index) {
          <span class="op__dot" [class.is-done]="i <= index()" [class.is-current]="i === index() && status() !== 'Delivered'"></span>
        }
      </span>
    </div>
  `,
  styles: [
    `
      .op {
        position: relative;
        height: 12px;
      }
      .op__bar {
        position: absolute;
        inset: 4px 0;
        border-radius: 999px;
        background: var(--color-border);
        overflow: hidden;
      }
      .op__fill {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--munch-orange);
        transition: width 700ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .op__dots {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: space-between;
      }
      .op__dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--surface);
        border: 2px solid var(--color-border-strong);
        transition: background-color 300ms, border-color 300ms;
      }
      .op__dot.is-done {
        background: var(--munch-orange);
        border-color: var(--munch-orange);
      }
      .op__dot.is-current {
        animation: op-pulse 1.6s ease-out infinite;
      }
      @keyframes op-pulse {
        0% { box-shadow: 0 0 0 0 rgba(200, 72, 26, 0.45); }
        100% { box-shadow: 0 0 0 8px rgba(200, 72, 26, 0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .op__dot.is-current { animation: none; }
        .op__fill { transition: none; }
      }
    `,
  ],
})
export class OrderProgressComponent {
  readonly status = input.required<OrderStatus>();
  protected readonly flow = ORDER_FLOW;
  protected readonly index = computed(() => ORDER_FLOW.indexOf(this.status()));
  protected readonly percent = computed(() => (this.index() / (ORDER_FLOW.length - 1)) * 100);
}
