import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * Lets a horizontally scrolling row be dragged with a mouse (touch already
 * scrolls natively). Also exposes scrollByPage() for arrow buttons.
 */
@Directive({ selector: '[appDragScroll]', standalone: true, exportAs: 'appDragScroll' })
export class DragScrollDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private startX = 0;
  private startLeft = 0;
  private dragging = false;
  private moved = false;

  scrollByPage(direction: 1 | -1): void {
    this.el.scrollBy({ left: direction * this.el.clientWidth * 0.8, behavior: 'smooth' });
  }

  @HostListener('pointerdown', ['$event'])
  onDown(ev: PointerEvent): void {
    if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
    this.dragging = true;
    this.moved = false;
    this.startX = ev.clientX;
    this.startLeft = this.el.scrollLeft;
  }

  @HostListener('window:pointermove', ['$event'])
  onMove(ev: PointerEvent): void {
    if (!this.dragging) return;
    const dx = ev.clientX - this.startX;
    if (Math.abs(dx) > 5) {
      this.moved = true;
      this.el.classList.add('is-dragging');
    }
    if (this.moved) this.el.scrollLeft = this.startLeft - dx;
  }

  @HostListener('window:pointerup')
  onUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.el.classList.remove('is-dragging');
  }

  /** A drag must not count as a tap on the card underneath. */
  @HostListener('click', ['$event'])
  onClick(ev: MouseEvent): void {
    if (this.moved) {
      ev.stopPropagation();
      ev.preventDefault();
      this.moved = false;
    }
  }
}
