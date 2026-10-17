import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

import { WelcomePage } from './welcome.page';
import { AuthService } from '../../services/auth.service';

@Component({ template: '', standalone: true })
class BlankPage {}

describe('WelcomePage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.user');
    await TestBed.configureTestingModule({
      imports: [WelcomePage],
      providers: [
        provideRouter([{ path: '**', component: BlankPage }]),
        { provide: ToastController, useValue: { create: async () => ({ present: async () => {} }) } },
      ],
    }).compileComponents();
  });

  it('offers sign up, log in and guest browsing', () => {
    const fixture = TestBed.createComponent(WelcomePage);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Create an account');
    expect(text).toContain('Log in');
    expect(text).toContain('Continue as guest');
  });

  it('shows a few popular products', () => {
    const fixture = TestBed.createComponent(WelcomePage);
    fixture.detectChanges();

    expect(fixture.componentInstance.popular.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('.popular__item').length).toBe(
      fixture.componentInstance.popular.length,
    );
  });

  it('lets a visitor continue as a guest and goes to /home', async () => {
    const fixture = TestBed.createComponent(WelcomePage);
    await fixture.componentInstance.continueAsGuest();

    expect(TestBed.inject(AuthService).isGuest()).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/home');
  });
});
