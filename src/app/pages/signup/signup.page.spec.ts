import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { SignupPage } from './signup.page';
import { AuthService } from '../../services/auth.service';

/** Blank stand-in so the router has somewhere to go after sign up. */
@Component({ template: '', standalone: true })
class BlankPage {}

describe('SignupPage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.user');
    localStorage.removeItem('munchrise.accounts');
    await TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [provideRouter([{ path: '**', component: BlankPage }])],
    }).compileComponents();
  });

  it('creates a normal account and goes to /home', async () => {
    const fixture = TestBed.createComponent(SignupPage);
    const component = fixture.componentInstance;
    component.firstName.set('Abi');
    component.email.set('abi@example.com');
    component.password.set('secret123');
    component.confirmPassword.set('secret123');

    await component.signUp();

    const auth = TestBed.inject(AuthService);
    expect(auth.isUser()).toBe(true);
    expect(auth.isAdmin()).toBe(false);
    expect(component.formError()).toBe('');
    expect(TestBed.inject(Router).url).toBe('/home');
  });

  it('refuses an email that is not a valid address', async () => {
    const fixture = TestBed.createComponent(SignupPage);
    const component = fixture.componentInstance;
    component.firstName.set('Abi');
    component.email.set('not-an-email');
    component.password.set('secret123');
    component.confirmPassword.set('secret123');

    await component.signUp();

    expect(component.formError()).toContain('valid email');
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
  });

  it('needs a password of at least 8 characters', async () => {
    const fixture = TestBed.createComponent(SignupPage);
    const component = fixture.componentInstance;
    component.firstName.set('Abi');
    component.email.set('abi@example.com');
    component.password.set('short12');
    component.confirmPassword.set('short12');

    await component.signUp();

    expect(component.formError()).toContain('at least 8 characters');
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
  });

  it('asks for matching passwords', async () => {
    const fixture = TestBed.createComponent(SignupPage);
    const component = fixture.componentInstance;
    component.firstName.set('Abi');
    component.email.set('abi@example.com');
    component.password.set('secret123');
    component.confirmPassword.set('secret124');

    await component.signUp();

    expect(component.formError()).toContain('do not match');
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
  });

  it('can continue as a guest instead', async () => {
    const fixture = TestBed.createComponent(SignupPage);
    const component = fixture.componentInstance;

    await component.continueAsGuest();

    expect(TestBed.inject(AuthService).isGuest()).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/home');
  });

  it('shows a spinner while the account is being created and ignores a second tap', async () => {
    const fixture = TestBed.createComponent(SignupPage);
    const component = fixture.componentInstance;
    const auth = TestBed.inject(AuthService);
    let finish!: (r: { ok: boolean; message: string }) => void;
    const spy = vi.spyOn(auth, 'signUp').mockReturnValue(new Promise((resolve) => (finish = resolve)));
    component.firstName.set('Abi');
    component.email.set('abi@example.com');
    component.password.set('secret123');
    component.confirmPassword.set('secret123');

    const first = component.signUp();
    const second = component.signUp();
    fixture.detectChanges();

    expect(component.busy()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Creating your account');
    expect(fixture.nativeElement.querySelector('ion-spinner')).not.toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);

    finish({ ok: false, message: 'nope' });
    await Promise.all([first, second]);
    expect(component.busy()).toBe(false);
  });

  it('stops the spinner when the request fails unexpectedly', async () => {
    const fixture = TestBed.createComponent(SignupPage);
    const component = fixture.componentInstance;
    vi.spyOn(TestBed.inject(AuthService), 'signUp').mockRejectedValue(new Error('offline'));
    component.firstName.set('Abi');
    component.email.set('abi@example.com');
    component.password.set('secret123');
    component.confirmPassword.set('secret123');

    await component.signUp();

    expect(component.busy()).toBe(false);
    expect(component.formError()).toContain('Something went wrong');
  });

  it('shows the Munchrise name in the top bar', () => {
    const fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('ion-title') as HTMLElement;
    const brand = title.querySelector('.nav-brand') as HTMLElement;
    expect(brand.textContent).toContain('Munchrise');

    // The page name sits on the right side of the toolbar.
    const page = fixture.nativeElement.querySelector('.nav-page') as HTMLElement;
    expect(page.textContent).toContain('Sign up');
    expect(title.contains(page)).toBe(false);
  });
});
