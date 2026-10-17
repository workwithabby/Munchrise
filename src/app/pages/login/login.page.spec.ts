import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { LoginPage } from './login.page';
import { AuthService } from '../../services/auth.service';

/** Blank stand-in so the router has somewhere to go after login. */
@Component({ template: '', standalone: true })
class BlankPage {}

describe('LoginPage', () => {
  beforeEach(async () => {
    localStorage.removeItem('munchrise.user');
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([{ path: '**', component: BlankPage }])],
    }).compileComponents();
  });

  it('signs the user in and goes to /home after a valid login', async () => {
    const auth = TestBed.inject(AuthService);
    auth.signUp('Abi', '', 'abi@example.com', 'secret123');
    auth.logout();

    const fixture = TestBed.createComponent(LoginPage);
    const component = fixture.componentInstance;
    component.email.set('abi@example.com');
    component.password.set('secret123');

    await component.login();

    expect(auth.isLoggedIn()).toBe(true);
    expect(component.formError()).toBe('');
    expect(TestBed.inject(Router).url).toBe('/home');
  });

  it('sends an admin straight to product management', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    const component = fixture.componentInstance;
    component.email.set('admin@munchrise.com');
    component.password.set('Admin123!');

    await component.login();

    expect(TestBed.inject(AuthService).isAdmin()).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/admin');
  });

  it('shows an error for an unknown account', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    const component = fixture.componentInstance;
    component.email.set('nobody@example.com');
    component.password.set('secret123');

    await component.login();

    expect(component.formError()).toContain('No account found');
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
  });

  it('refuses an email that is not a valid address', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    const component = fixture.componentInstance;
    component.email.set('not-an-email');
    component.password.set('secret123');

    await component.login();

    expect(component.formError()).toContain('valid email');
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
  });

  it('asks for a password when the field is empty', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    const component = fixture.componentInstance;
    component.email.set('abi@example.com');
    component.password.set('');

    await component.login();

    expect(component.formError()).toContain('password');
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
  });

  it('shows the Munchrise name in the top bar', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('ion-title') as HTMLElement;
    const brand = title.querySelector('.nav-brand') as HTMLElement;
    expect(brand.textContent).toContain('Munchrise');

    // The page name sits on the right side of the toolbar.
    const page = fixture.nativeElement.querySelector('.nav-page') as HTMLElement;
    expect(page.textContent).toContain('Login');
    expect(title.contains(page)).toBe(false);
  });
});
